import { getErrorMessage } from "@/core/utils/error";
import { hashFile } from "@/core/utils/hashFile";
import { getSafeServerPath } from "@/core/utils/serverPath";
import { ServerModsRepository } from "@/modules/database/repositories/server-mods.repository";
import { ModrinthClient } from "@/modules/modrinth/modrinth-client.service";
import { Injectable, Logger } from "@nestjs/common";
import { promises as fs } from "fs";
import { join } from "path";

// Modrinth takes big hash lists, chunks keep each request reasonable
const LOOKUP_CHUNK = 200;

/**
 * Finds which jars in mods/ are known Modrinth versions and records them as
 * managed mods, so updates work from the panel right away
 */
@Injectable()
export class ModpackContentRegistrar {
  private readonly logger = new Logger(ModpackContentRegistrar.name);

  constructor(
    private readonly modrinth: ModrinthClient,
    private readonly mods: ServerModsRepository,
  ) {}

  /** Returns how many jars became managed, lookup failures leave them manual */
  async register(serverId: string): Promise<number> {
    const jars = await this.hashJars(serverId);
    if (jars.size === 0) return 0;

    const hashes = [...jars.keys()];
    let registered = 0;
    for (let i = 0; i < hashes.length; i += LOOKUP_CHUNK) {
      const chunk = hashes.slice(i, i + LOOKUP_CHUNK);
      try {
        const versions = await this.modrinth.getVersionsByHashes(
          chunk,
          "sha512",
        );
        for (const hash of chunk) {
          const version = versions[hash];
          if (!version) continue;
          if (this.record(serverId, jars.get(hash)!, hash, version)) {
            registered++;
          }
        }
      } catch (error) {
        this.logger.warn(
          `Modrinth lookup failed for server ${serverId}, mods stay manual: ${getErrorMessage(error)}`,
        );
      }
    }
    return registered;
  }

  private record(
    serverId: string,
    fileName: string,
    hash: string,
    version: { id: string; project_id: string },
  ): boolean {
    if (this.mods.findByServerAndProject(serverId, version.project_id)) {
      return false;
    }
    this.mods.create({
      serverId,
      projectId: version.project_id,
      versionId: version.id,
      fileName,
      fileHash: hash,
    });
    return true;
  }

  /** sha512 of every top-level jar in mods/, keyed by hash */
  private async hashJars(serverId: string): Promise<Map<string, string>> {
    const dir = getSafeServerPath(serverId, "mods");
    const entries = await fs
      .readdir(dir, { withFileTypes: true })
      .catch(() => []);
    const jars = new Map<string, string>();
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".jar")) continue;
      const { sha512 } = await hashFile(join(dir, entry.name), ["sha512"]);
      jars.set(sha512, entry.name);
    }
    return jars;
  }
}
