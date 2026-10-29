import { isInside } from "@/core/utils/paths";
import { BadRequestException, Injectable } from "@nestjs/common";
import { BackupFormat, type OrphanArchive } from "@shared/types/backup.types";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import { join, relative, resolve, sep } from "path";

const STAGING_PREFIXES = ["temp-", "restore-", "download-"];
const ARCHIVE_NAME = /\.(zip|tar\.gz)$/;

/** Archives on the panel disk, keys are paths relative to ./backups */
@Injectable()
export class LocalBackupStore {
  readonly root = resolve("./backups");

  async init(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
  }

  keyFor(serverId: string, backupId: string, format: BackupFormat): string {
    return `${serverId}/${backupId}.${archiveExtension(format)}`;
  }

  pathOf(objectKey: string): string {
    const full = resolve(this.root, objectKey);
    if (full === this.root || !isInside(this.root, full)) {
      throw new BadRequestException("Invalid backup location");
    }
    return full;
  }

  async prepare(objectKey: string): Promise<string> {
    const full = this.pathOf(objectKey);
    await fs.mkdir(resolve(full, ".."), { recursive: true });
    return full;
  }

  async remove(objectKey: string): Promise<void> {
    await fs.rm(this.pathOf(objectKey), { force: true });
  }

  async removeServer(serverId: string): Promise<void> {
    await fs.rm(this.pathOf(serverId), { recursive: true, force: true });
  }

  /** Scratch folder inside the backups root, removed by the caller */
  async stagingDir(kind: "restore" | "download"): Promise<string> {
    const dir = join(this.root, `${kind}-${randomUUID()}`);
    await fs.mkdir(dir, { recursive: true });
    return dir;
  }

  /** Archives in the root and in server folders, staging folders skipped */
  async listArchives(): Promise<OrphanArchive[]> {
    const found: OrphanArchive[] = [];
    const walk = async (dir: string, nested: boolean): Promise<void> => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          const staging = STAGING_PREFIXES.some((p) =>
            entry.name.startsWith(p),
          );
          if (!nested && !staging) await walk(full, true);
        } else if (entry.isFile() && ARCHIVE_NAME.test(entry.name)) {
          const stat = await fs.stat(full);
          found.push({
            key: relative(this.root, full).split(sep).join("/"),
            size: stat.size,
            modifiedAt: Math.round(stat.mtimeMs),
          });
        }
      }
    };
    await walk(this.root, false);
    return found;
  }

  /** Scratch folders left behind by a crash, removed on startup */
  async removeStaleStaging(): Promise<number> {
    const entries = await fs.readdir(this.root, { withFileTypes: true });
    const stale = entries.filter(
      (e) =>
        e.isDirectory() && STAGING_PREFIXES.some((p) => e.name.startsWith(p)),
    );
    await Promise.all(
      stale.map((e) =>
        fs.rm(join(this.root, e.name), { recursive: true, force: true }),
      ),
    );
    return stale.length;
  }
}

export const archiveExtension = (format: BackupFormat) =>
  format === BackupFormat.TAR_GZ ? "tar.gz" : "zip";
