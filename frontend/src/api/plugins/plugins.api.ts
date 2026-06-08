import {
  authHttp,
  buildQueryString,
  type AuthHttpClient,
} from "@/shared/lib/http";
import type {
  ContentKind,
  ContentSearchParams,
  ContentTaskRef,
  InstallContentPayload,
  InstalledPluginView,
  ModrinthProject,
  ModrinthSearchResponse,
  ModrinthVersion,
  RemoveContentPayload,
  UpdateContentPayload,
} from "./plugins.model";

export class ModrinthContentApi {
  constructor(
    private authHttp: AuthHttpClient,
    private basePath: string,
    private resourceSegment: string
  ) {}

  private buildUrl = (...segments: string[]): string =>
    [this.basePath, ...segments].join("/");

  search = (params: ContentSearchParams): Promise<ModrinthSearchResponse> =>
    this.authHttp.get<ModrinthSearchResponse>(
      `${this.basePath}/search${buildQueryString(params)}`
    );

  getProject = (projectId: string): Promise<ModrinthProject> =>
    this.authHttp.get<ModrinthProject>(this.buildUrl("projects", projectId));

  getProjectVersions = (
    projectId: string,
    filters: { gameVersion?: string; loader?: string } = {}
  ): Promise<ModrinthVersion[]> =>
    this.authHttp.get<ModrinthVersion[]>(
      `${this.buildUrl("projects", projectId, "versions")}${buildQueryString(filters)}`
    );

  getInstalled = (serverId: string): Promise<InstalledPluginView[]> =>
    this.authHttp.get<InstalledPluginView[]>(
      this.buildUrl("installed", serverId)
    );

  install = (payload: InstallContentPayload): Promise<ContentTaskRef> =>
    this.authHttp.post<ContentTaskRef>(`${this.basePath}/install`, {
      json: payload,
    });

  update = (
    serverId: string,
    recordId: string,
    payload: UpdateContentPayload
  ): Promise<ContentTaskRef> =>
    this.authHttp.post<ContentTaskRef>(
      this.buildUrl(
        "servers",
        serverId,
        this.resourceSegment,
        recordId,
        "update"
      ),
      { json: payload }
    );

  remove = (
    serverId: string,
    recordId: string,
    payload: RemoveContentPayload = {}
  ): Promise<ContentTaskRef> =>
    this.authHttp.delete<ContentTaskRef>(
      this.buildUrl("servers", serverId, this.resourceSegment, recordId),
      { json: payload }
    );
}

export const pluginsApi = new ModrinthContentApi(
  authHttp,
  "plugins",
  "plugins"
);
export const modsApi = new ModrinthContentApi(authHttp, "mods", "mods");

/** Resolve the right client for the given content kind */
export function contentApi(kind: ContentKind): ModrinthContentApi {
  return kind === "mod" ? modsApi : pluginsApi;
}
