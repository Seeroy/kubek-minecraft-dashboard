import { runPool } from "@/core/utils/run-pool";
import { getSafeServerPath } from "@/core/utils/serverPath";
import { Logger } from "@nestjs/common";
import type {
  InstalledPluginView,
  ModrinthVersion,
  ServerPluginRecord,
} from "@shared/types/plugins";
import { promises as fs } from "fs";
import { join } from "path";
import { ModrinthClient } from "./modrinth-client.service";
import {
  pickLatestCompatible,
  projectToSummary,
  versionToSummary,
} from "./modrinth-mappers";

const LOOKUP_CONCURRENCY = 8;
const LATEST_TTL_MS = 10 * 60 * 1000;

/** A managed record with a newer compatible build on Modrinth */
export interface ContentUpdate {
  recordId: string;
  projectId: string;
  installedVersionId: string;
  latestVersionId: string;
  title?: string;
}

// A newer id republished with an older date is not an update
function isNewer(
  newest: ModrinthVersion | undefined,
  installed: ModrinthVersion | undefined,
): newest is ModrinthVersion {
  return !!(
    newest &&
    installed &&
    newest.id !== installed.id &&
    Date.parse(newest.date_published) > Date.parse(installed.date_published)
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Builds the installed list of a content folder: managed records enriched
 * with Modrinth metadata plus loose jars dropped in by hand
 */
export class InstalledContentReader {
  private readonly latestCache = new Map<
    string,
    { at: number; version: ModrinthVersion | undefined }
  >();

  constructor(
    private readonly modrinth: ModrinthClient,
    private readonly folder: string,
    private readonly loaders: string[],
    private readonly logger: Logger,
  ) {}

  async read(
    serverId: string,
    records: ServerPluginRecord[],
    gameVersion?: string,
  ): Promise<InstalledPluginView[]> {
    const managed = await this.describeManaged(records, gameVersion);
    const manual = await this.listManualJars(serverId, records);
    return [...managed, ...manual];
  }

  // Two bulk requests for projects and installed versions, then one filtered
  // version list per project, a modpack server has dozens of records
  private async describeManaged(
    records: ServerPluginRecord[],
    gameVersion?: string,
  ): Promise<InstalledPluginView[]> {
    if (records.length === 0) return [];
    const projectIds = [...new Set(records.map((r) => r.projectId))];
    const [projects, versions, latest] = await Promise.all([
      this.modrinth.getProjects(projectIds),
      this.modrinth.getVersions([...new Set(records.map((r) => r.versionId))]),
      this.latestVersions(projectIds, gameVersion),
    ]);
    const projectById = new Map(projects.map((p) => [p.id, p]));
    const versionById = new Map(versions.map((v) => [v.id, v]));

    return records.map((record) => {
      const project = projectById.get(record.projectId);
      const installed = versionById.get(record.versionId);
      const newest = latest.get(record.projectId);
      const hasUpdate = isNewer(newest, installed);
      return {
        ...record,
        type: "modrinth" as const,
        // A project removed from Modrinth still lists, just without details
        metadata: project && projectToSummary(project),
        version: installed && versionToSummary(installed),
        hasUpdate,
        latestVersion: hasUpdate ? versionToSummary(newest!) : undefined,
      };
    });
  }

  /** Slow update check for the background job, shares the cache with the list */
  async findUpdates(
    records: ServerPluginRecord[],
    gameVersion: string | undefined,
    pauseMs: number,
  ): Promise<ContentUpdate[]> {
    if (records.length === 0) return [];
    const projectIds = [...new Set(records.map((r) => r.projectId))];
    const latest = await this.latestVersions(projectIds, gameVersion, pauseMs);
    const candidates = records.filter((record) => {
      const newest = latest.get(record.projectId);
      return newest && newest.id !== record.versionId;
    });
    if (candidates.length === 0) return [];

    await sleep(pauseMs);
    const installed = await this.modrinth.getVersions([
      ...new Set(candidates.map((r) => r.versionId)),
    ]);
    const installedById = new Map(installed.map((v) => [v.id, v]));
    const updates = candidates.filter((record) =>
      isNewer(latest.get(record.projectId), installedById.get(record.versionId)),
    );
    if (updates.length === 0) return [];

    await sleep(pauseMs);
    const projects = await this.modrinth.getProjects([
      ...new Set(updates.map((r) => r.projectId)),
    ]);
    const titleById = new Map(projects.map((p) => [p.id, p.title]));
    return updates.map((record) => ({
      recordId: record.id,
      projectId: record.projectId,
      installedVersionId: record.versionId,
      latestVersionId: latest.get(record.projectId)!.id,
      title: titleById.get(record.projectId),
    }));
  }

  /** Newest version per project that runs on this server, cached for a while */
  private async latestVersions(
    projectIds: string[],
    gameVersion?: string,
    pauseMs = 0,
  ): Promise<Map<string, ModrinthVersion | undefined>> {
    const now = Date.now();
    const result = new Map<string, ModrinthVersion | undefined>();
    const missing: string[] = [];
    for (const id of projectIds) {
      const hit = this.latestCache.get(`${id}|${gameVersion ?? ""}`);
      if (hit && now - hit.at < LATEST_TTL_MS) result.set(id, hit.version);
      else missing.push(id);
    }

    const lookup = async (id: string) => {
      try {
        const versions = await this.modrinth.getProjectVersions(id, {
          loaders: this.loaders,
          gameVersions: gameVersion ? [gameVersion] : undefined,
        });
        const version = pickLatestCompatible(
          versions,
          this.loaders,
          gameVersion,
        );
        this.latestCache.set(`${id}|${gameVersion ?? ""}`, {
          at: Date.now(),
          version,
        });
        result.set(id, version);
      } catch (error) {
        // No update badge beats a list that does not load
        this.logger.debug(`Latest version of ${id} unknown: ${String(error)}`);
      }
    };

    if (pauseMs > 0) {
      for (const id of missing) {
        await sleep(pauseMs);
        await lookup(id);
      }
    } else {
      await runPool(missing, LOOKUP_CONCURRENCY, lookup);
    }
    return result;
  }

  private async listManualJars(
    serverId: string,
    records: ServerPluginRecord[],
  ): Promise<InstalledPluginView[]> {
    const contentDir = getSafeServerPath(serverId, this.folder);
    const managed = new Set(records.map((record) => record.fileName));
    try {
      const files = await fs.readdir(contentDir);
      const jars = files.filter(
        (file) => file.endsWith(".jar") && !managed.has(file),
      );
      return await Promise.all(
        jars.map(async (jarFile) => {
          const stats = await fs.stat(join(contentDir, jarFile));
          return {
            id: `manual-${jarFile}`,
            serverId,
            projectId: "",
            versionId: "",
            fileName: jarFile,
            fileHash: undefined,
            dependencyOf: undefined,
            installedAt: stats.mtime.getTime(),
            updatedAt: undefined,
            type: "manual" as const,
            hasUpdate: false,
          };
        }),
      );
    } catch (error) {
      this.logger.warn(
        `Could not read ${this.folder} directory for server ${serverId}: ${error}`,
      );
      return [];
    }
  }
}
