import { Injectable, Logger } from "@nestjs/common";
import { createHash } from "crypto";
import { promises as fs } from "fs";
import { Jimp } from "jimp";
import { join } from "path";
import {
  MojangProfileClient,
  MojangUnavailableError,
} from "@/modules/mojang/mojang-profile.client";

const NAME_PATTERN = /^[A-Za-z0-9_]{1,16}$/;

const CACHE_DIR = join(process.cwd(), ".cache", "heads");
// A cached head is served for this long before a background refresh
const FRESH_MS = 24 * 60 * 60 * 1000;
// Unknown names are not looked up again until this expires
const MISS_MS = 6 * 60 * 60 * 1000;
// Mojang unreachable, retry soon without persisting the miss
const OFFLINE_MISS_MS = 10 * 60 * 1000;

const MEMORY_LIMIT = 500;

export interface Head {
  png: Buffer;
  etag: string;
}

interface Entry {
  head: Head | null;
  checkedAt: number;
  ttl: number;
}

@Injectable()
export class HeadsService {
  private readonly logger = new Logger(HeadsService.name);
  private readonly memory = new Map<string, Entry>();
  private readonly inFlight = new Map<string, Promise<Entry>>();

  constructor(private readonly mojang: MojangProfileClient) {}

  isValidName(name: string): boolean {
    return NAME_PATTERN.test(name);
  }

  /** Head for a player name, or null when the name has no skin */
  async getHead(name: string): Promise<Head | null> {
    const key = name.toLowerCase();
    const entry = this.fromMemory(key) ?? (await this.fromDisk(key));

    if (entry) {
      this.remember(key, entry);
      if (Date.now() - entry.checkedAt > entry.ttl) {
        // Serve what we have now, refresh for the next request
        void this.refresh(key, name).catch(() => undefined);
      }
      return entry.head;
    }

    return (await this.refresh(key, name)).head;
  }

  private refresh(key: string, name: string): Promise<Entry> {
    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const task = this.lookup(name)
      .then(async (head) => {
        const entry: Entry = {
          head,
          checkedAt: Date.now(),
          ttl: head ? FRESH_MS : MISS_MS,
        };
        await this.persist(key, head);
        return entry;
      })
      .catch((error: unknown) => {
        if (!(error instanceof MojangUnavailableError)) throw error;
        const stale = this.memory.get(key);
        return {
          head: stale?.head ?? null,
          checkedAt: Date.now(),
          ttl: OFFLINE_MISS_MS,
        };
      })
      .then((entry) => {
        this.remember(key, entry);
        return entry;
      })
      .finally(() => this.inFlight.delete(key));

    this.inFlight.set(key, task);
    return task;
  }

  private async lookup(name: string): Promise<Head | null> {
    const profile = await this.mojang.lookup(name);
    if (!profile) return null;

    const skinUrl = await this.mojang.skinUrl(profile.id);
    if (!skinUrl) return null;

    const skin = await this.mojang.skin(skinUrl);
    // A skin that fails to decode counts as no skin
    return await renderHead(skin).catch(() => null);
  }

  private fromMemory(key: string): Entry | undefined {
    const entry = this.memory.get(key);
    if (!entry) return undefined;
    // Re-insert to keep Map order as LRU order
    this.memory.delete(key);
    this.memory.set(key, entry);
    return entry;
  }

  private remember(key: string, entry: Entry) {
    this.memory.delete(key);
    this.memory.set(key, entry);
    const oldest = this.memory.keys().next();
    if (this.memory.size > MEMORY_LIMIT && !oldest.done) {
      this.memory.delete(oldest.value);
    }
  }

  private async fromDisk(key: string): Promise<Entry | undefined> {
    try {
      const path = join(CACHE_DIR, `${key}.png`);
      const stat = await fs.stat(path);
      return {
        head: toHead(await fs.readFile(path)),
        checkedAt: stat.mtimeMs,
        ttl: FRESH_MS,
      };
    } catch {
      return undefined;
    }
  }

  // Misses stay in the bounded memory cache only, so random names cannot fill the disk
  private async persist(key: string, head: Head | null) {
    try {
      const png = join(CACHE_DIR, `${key}.png`);
      if (head) {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        await fs.writeFile(png, head.png);
      } else {
        await fs.rm(png, { force: true });
      }
    } catch (error: unknown) {
      this.logger.warn(`Failed to cache head ${key}: ${String(error)}`);
    }
  }
}

function toHead(png: Buffer): Head {
  return {
    png,
    etag: `"${createHash("sha1").update(png).digest("hex").slice(0, 16)}"`,
  };
}

/** Face layer with the hat overlay on top, 8x8 */
async function renderHead(skinPng: Buffer): Promise<Head> {
  const skin = await Jimp.read(skinPng);
  const face = skin.clone().crop({ x: 8, y: 8, w: 8, h: 8 });
  const hat = skin.clone().crop({ x: 40, y: 8, w: 8, h: 8 });
  face.composite(hat, 0, 0);
  return toHead(await face.getBuffer("image/png"));
}
