import { Injectable, Logger } from "@nestjs/common";
import ky, { HTTPError } from "ky";
import { formatUuid } from "./uuid";

export interface MojangProfile {
  /** Dashed UUID */
  id: string;
  /** Name with the canonical casing */
  name: string;
}

interface CachedProfile {
  profile: MojangProfile | null;
  expiresAt: number;
}

const PROFILE_TTL_MS = 60 * 60 * 1000;
// Short, so a freshly registered name is found soon after a miss
const MISS_TTL_MS = 10 * 60 * 1000;
const MEMORY_LIMIT = 1000;
const MAX_PARALLEL = 4;
// Callers can be public endpoints, a flood of names must not pile up requests
const MAX_QUEUED = 32;
const SKIN_HOST = "textures.minecraft.net";

/** Mojang could not be asked, unlike a confirmed missing player */
export class MojangUnavailableError extends Error {}

const http = ky.create({ timeout: 5000, retry: 0 });

@Injectable()
export class MojangProfileClient {
  private readonly logger = new Logger(MojangProfileClient.name);
  private readonly profiles = new Map<string, CachedProfile>();
  private readonly inFlight = new Map<string, Promise<MojangProfile | null>>();
  private active = 0;
  private readonly queue: Array<() => void> = [];

  /** Profile for a name, null when no such account exists */
  lookup(name: string): Promise<MojangProfile | null> {
    const key = name.toLowerCase();
    const cached = this.profiles.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return Promise.resolve(cached.profile);
    }

    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const task = this.limited(() =>
      this.json<{ id: string; name: string }>(
        `https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(name)}`,
      ),
    )
      .then((raw) => {
        const profile = raw ? { id: formatUuid(raw.id), name: raw.name } : null;
        this.remember(key, profile);
        return profile;
      })
      .finally(() => this.inFlight.delete(key));

    this.inFlight.set(key, task);
    return task;
  }

  /** Skin URL of a profile, only when it points at Mojang's texture host */
  async skinUrl(uuid: string): Promise<string | null> {
    const session = await this.limited(() =>
      this.json<{ properties?: { name: string; value: string }[] }>(
        `https://sessionserver.mojang.com/session/minecraft/profile/${uuid.replace(/-/g, "")}`,
      ),
    );
    const textures = session?.properties?.find((p) => p.name === "textures");
    return textures ? parseSkinUrl(textures.value) : null;
  }

  async skin(url: string): Promise<Buffer> {
    const body = await this.limited(() =>
      http
        .get(url)
        .arrayBuffer()
        .catch((error: unknown) => {
          throw new MojangUnavailableError(String(error));
        }),
    );
    return Buffer.from(body);
  }

  /** JSON body, null on 404/204, MojangUnavailableError on network trouble */
  private async json<T>(url: string): Promise<T | null> {
    try {
      const response = await http.get(url);
      if (response.status === 204) return null;
      return await response.json<T>();
    } catch (error: unknown) {
      if (
        error instanceof HTTPError &&
        [400, 404].includes(error.response.status)
      ) {
        return null;
      }
      this.logger.debug(`Mojang request failed: ${String(error)}`);
      throw new MojangUnavailableError(String(error));
    }
  }

  private remember(key: string, profile: MojangProfile | null) {
    this.profiles.delete(key);
    this.profiles.set(key, {
      profile,
      expiresAt: Date.now() + (profile ? PROFILE_TTL_MS : MISS_TTL_MS),
    });
    const oldest = this.profiles.keys().next();
    if (this.profiles.size > MEMORY_LIMIT && !oldest.done) {
      this.profiles.delete(oldest.value);
    }
  }

  private async limited<T>(run: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await run();
    } finally {
      this.release();
    }
  }

  private acquire(): Promise<void> {
    if (this.active < MAX_PARALLEL) {
      this.active++;
      return Promise.resolve();
    }
    if (this.queue.length >= MAX_QUEUED) {
      return Promise.reject(new MojangUnavailableError("Lookup queue is full"));
    }
    return new Promise((resolve) => this.queue.push(resolve));
  }

  private release() {
    const next = this.queue.shift();
    if (next) next();
    else this.active--;
  }
}

function parseSkinUrl(value: string): string | null {
  try {
    const decoded = JSON.parse(
      Buffer.from(value, "base64").toString("utf8"),
    ) as { textures?: { SKIN?: { url?: string } } };
    const url = new URL(decoded.textures?.SKIN?.url ?? "");
    return url.hostname === SKIN_HOST ? url.href : null;
  } catch {
    return null;
  }
}
