import { authHttp, buildQueryString, type AuthHttpClient } from "@/shared/lib/http";
import type { ModrinthSearchResponse, ModrinthVersion } from "@shared/types/plugins";
import type { ServerCreatedResponse } from "../servers/servers.model";
import type { InstallModpackProps, ModpackPreview, ModpackSearchParams } from "./modpacks.model";

// Reading a big uploaded pack takes a while
const INSPECT_TIMEOUT_MS = 15 * 60_000;

export class ModpacksApi {
  constructor(private authHttp: AuthHttpClient) {}

  search = (params: ModpackSearchParams): Promise<ModrinthSearchResponse> =>
    this.authHttp.get<ModrinthSearchResponse>(`modpacks/search${buildQueryString(params)}`);

  getVersions = (projectId: string): Promise<ModrinthVersion[]> =>
    this.authHttp.get<ModrinthVersion[]>(`modpacks/projects/${encodeURIComponent(projectId)}/versions`);

  inspectFile = (file: File): Promise<ModpackPreview> => {
    const formData = new FormData();
    formData.append("file", file);
    return this.authHttp.post<ModpackPreview>("modpacks/inspect", { body: formData, timeout: INSPECT_TIMEOUT_MS });
  };

  /** Starts the download in the background, the task result is the preview */
  inspectModrinth = (projectId: string, versionId: string): Promise<{ taskId: string }> =>
    this.authHttp.post<{ taskId: string }>("modpacks/inspect/modrinth", { json: { projectId, versionId } });

  discard = (packId: string): Promise<void> => this.authHttp.delete<void>(`modpacks/staged/${packId}`);

  install = (payload: InstallModpackProps): Promise<ServerCreatedResponse> => this.authHttp.post<ServerCreatedResponse>("modpacks/install", { json: payload });
}

export const modpacksApi = new ModpacksApi(authHttp);
