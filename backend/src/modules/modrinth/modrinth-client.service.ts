import { Injectable } from "@nestjs/common";
import type {
  ModrinthProject,
  ModrinthSearchResponse,
  ModrinthVersion,
  ModrinthVersionFilesResponse,
} from "@shared/types/plugins";
import ky, { KyInstance } from "ky";

export const MODRINTH_USER_AGENT = "KubekPanel/2026 (https://kubekpanel.ru)";

export interface ModrinthSearchParams {
  query?: string;
  limit?: number;
  offset?: number;
  index?: string;
  facets: string[][];
}

// Keeps the query string well under URL limits
const BULK_CHUNK = 100;

export interface ModrinthVersionsFilter {
  loaders?: string[];
  gameVersions?: string[];
}

/**
 * Thin typed wrapper over the Modrinth v2 REST API
 */
@Injectable()
export class ModrinthClient {
  private readonly http: KyInstance = ky.create({
    prefix: "https://api.modrinth.com/v2",
    headers: { "User-Agent": MODRINTH_USER_AGENT },
    timeout: 15000,
  });

  search(params: ModrinthSearchParams): Promise<ModrinthSearchResponse> {
    const searchParams = new URLSearchParams();
    if (params.query) searchParams.set("query", params.query);
    searchParams.set("limit", String(params.limit ?? 20));
    searchParams.set("offset", String(params.offset ?? 0));
    searchParams.set("facets", JSON.stringify(params.facets));
    if (params.index) searchParams.set("index", params.index);

    return this.http
      .get("search", { searchParams })
      .json<ModrinthSearchResponse>();
  }

  getProject(projectIdOrSlug: string): Promise<ModrinthProject> {
    return this.http
      .get(`project/${encodeURIComponent(projectIdOrSlug)}`)
      .json<ModrinthProject>();
  }

  getVersion(versionId: string): Promise<ModrinthVersion> {
    return this.http
      .get(`version/${encodeURIComponent(versionId)}`)
      .json<ModrinthVersion>();
  }

  /** Many projects in one request, unknown ids are left out */
  getProjects(ids: string[]): Promise<ModrinthProject[]> {
    return this.bulk<ModrinthProject>("projects", ids);
  }

  /** Many versions in one request, unknown ids are left out */
  getVersions(ids: string[]): Promise<ModrinthVersion[]> {
    return this.bulk<ModrinthVersion>("versions", ids);
  }

  private async bulk<T>(path: string, ids: string[]): Promise<T[]> {
    const chunks: string[][] = [];
    for (let i = 0; i < ids.length; i += BULK_CHUNK) {
      chunks.push(ids.slice(i, i + BULK_CHUNK));
    }
    const pages = await Promise.all(
      chunks.map((chunk) =>
        this.http
          .get(path, { searchParams: { ids: JSON.stringify(chunk) } })
          .json<T[]>(),
      ),
    );
    return pages.flat();
  }

  /** Versions of a project, every published one when no filter is given */
  getProjectVersions(
    projectIdOrSlug: string,
    filter: ModrinthVersionsFilter = {},
  ): Promise<ModrinthVersion[]> {
    const searchParams = new URLSearchParams();
    if (filter.gameVersions?.length) {
      searchParams.append("game_versions", JSON.stringify(filter.gameVersions));
    }
    if (filter.loaders?.length) {
      // Modrinth accepts the nested form, kept as the engine always sent it
      searchParams.append("loaders", JSON.stringify([filter.loaders]));
    }

    return this.http
      .get(`project/${encodeURIComponent(projectIdOrSlug)}/version`, {
        searchParams,
      })
      .json<ModrinthVersion[]>();
  }

  /** Look versions up by file hashes, unknown hashes are absent from the result */
  getVersionsByHashes(
    hashes: string[],
    algorithm: "sha1" | "sha512",
  ): Promise<ModrinthVersionFilesResponse> {
    if (hashes.length === 0) return Promise.resolve({});
    return this.http
      .post("version_files", { json: { hashes, algorithm } })
      .json<ModrinthVersionFilesResponse>();
  }
}
