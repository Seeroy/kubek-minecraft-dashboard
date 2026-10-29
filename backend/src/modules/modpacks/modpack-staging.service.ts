import { getErrorMessage } from "@/core/utils/error";
import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  ModpackErrorCode,
  type ModpackSource,
} from "@shared/types/modpack.types";
import { randomUUID } from "crypto";
import { promises as fs, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import type { MrpackManifest } from "./mrpack/mrpack-reader";

const STAGING_ROOT = join(tmpdir(), "kubek-modpacks");
export const MODPACK_UPLOAD_DIR = join(STAGING_ROOT, "uploads");

// Long enough to read the preview and fill the form
const STAGED_TTL_MS = 60 * 60 * 1000;

export interface StagedPackMeta {
  source: ModpackSource;
  projectId?: string;
  versionId?: string;
  iconUrl?: string;
  hasClientOverrides: boolean;
}

export interface StagedPack extends StagedPackMeta {
  id: string;
  ownerId: string;
  dir: string;
  archivePath: string;
  manifest: MrpackManifest;
  createdAt: number;
  claimed: boolean;
}

/** Multer destination that makes sure the upload folder exists */
export function modpackUploadDestination(
  _req: unknown,
  _file: unknown,
  cb: (error: Error | null, destination: string) => void,
): void {
  try {
    mkdirSync(MODPACK_UPLOAD_DIR, { recursive: true });
    cb(null, MODPACK_UPLOAD_DIR);
  } catch (error) {
    cb(error as Error, MODPACK_UPLOAD_DIR);
  }
}

/**
 * Keeps inspected packs on disk between the preview and the install, so the
 * archive is uploaded or downloaded only once
 */
@Injectable()
export class ModpackStagingService implements OnModuleInit {
  private readonly logger = new Logger(ModpackStagingService.name);
  private readonly packs = new Map<string, StagedPack>();

  // Staged packs live in memory, whatever is left on disk from a previous run is garbage
  async onModuleInit(): Promise<void> {
    await fs.rm(STAGING_ROOT, { recursive: true, force: true }).catch(() => {});
  }

  /** Fresh folder for a pack that is about to be staged */
  async allocate(): Promise<{ id: string; dir: string }> {
    const id = randomUUID();
    const dir = join(STAGING_ROOT, id);
    await fs.mkdir(dir, { recursive: true });
    return { id, dir };
  }

  add(
    slot: { id: string; dir: string },
    ownerId: string,
    archivePath: string,
    manifest: MrpackManifest,
    meta: StagedPackMeta,
  ): StagedPack {
    const pack: StagedPack = {
      ...meta,
      id: slot.id,
      dir: slot.dir,
      ownerId,
      archivePath,
      manifest,
      createdAt: Date.now(),
      claimed: false,
    };
    this.packs.set(pack.id, pack);
    return pack;
  }

  /** Reserve a pack for one install, only its owner may do that */
  claim(packId: string, ownerId: string): StagedPack {
    const pack = this.packs.get(packId);
    if (!pack || pack.ownerId !== ownerId || pack.claimed) {
      throw new NotFoundException({
        code: ModpackErrorCode.NOT_FOUND,
        message: "The modpack preview expired, inspect it again",
      });
    }
    pack.claimed = true;
    return pack;
  }

  release(pack: StagedPack): void {
    pack.claimed = false;
  }

  /** Drop a pack the owner no longer needs, unknown ids are ignored */
  async discardOwned(packId: string, ownerId: string): Promise<void> {
    const pack = this.packs.get(packId);
    if (pack && pack.ownerId === ownerId && !pack.claimed) {
      await this.discard(pack);
    }
  }

  async discard(pack: StagedPack | { id: string; dir: string }): Promise<void> {
    this.packs.delete(pack.id);
    await fs.rm(pack.dir, { recursive: true, force: true });
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async sweep(): Promise<void> {
    const now = Date.now();
    for (const pack of this.packs.values()) {
      if (pack.claimed || now - pack.createdAt < STAGED_TTL_MS) continue;
      await this.discard(pack).catch((error: unknown) =>
        this.logger.warn(
          `Failed to drop staged modpack ${pack.id}: ${getErrorMessage(error)}`,
        ),
      );
    }
  }
}
