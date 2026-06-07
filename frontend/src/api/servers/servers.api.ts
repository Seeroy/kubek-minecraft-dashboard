import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type {
  BulkDeleteResult,
  CreateServerDto,
  Server,
  ServerCreatedResponse,
  ServerFull,
} from "./servers.model";

export class ServersApi {
  constructor(private authHttp: AuthHttpClient) {}

  getAll = (): Promise<Server[]> => this.authHttp.get<Server[]>("servers");

  create = (
    data: CreateServerDto,
    coreFile?: File
  ): Promise<ServerCreatedResponse> => {
    const formData = new FormData();
    formData.append("payload", JSON.stringify(data));
    if (coreFile) {
      formData.append("coreFile", coreFile);
    }

    return this.authHttp.post<ServerCreatedResponse>("servers", {
      body: formData,
    });
  };

  getById = (id: string): Promise<ServerFull> =>
    this.authHttp.get<ServerFull>(`servers/${id}`);

  remove = (
    id: string,
    body: { password: string; confirmName: string }
  ): Promise<void> =>
    this.authHttp.delete<void>(`servers/${id}`, { json: body });

  bulkRemove = (ids: string[], password: string): Promise<BulkDeleteResult> =>
    this.authHttp.post<BulkDeleteResult>("servers/bulk-delete", {
      json: { ids, password },
    });

  duplicate = (id: string, name: string): Promise<ServerCreatedResponse> =>
    this.authHttp.post<ServerCreatedResponse>(`servers/${id}/duplicate`, {
      json: { name },
    });

  exportArchive = async (
    id: string
  ): Promise<{ blob: Blob; filename: string }> => {
    const response = await this.authHttp.raw.get(`servers/${id}/export`, {
      timeout: false,
    });
    if (!response.ok) {
      throw new Error(`Export failed: ${response.status}`);
    }
    const disposition = response.headers.get("content-disposition") || "";
    const match = disposition.match(/filename="?([^";]+)"?/i);
    const filename = match?.[1] || `server-${id}.zip`;
    const blob = await response.blob();
    return { blob, filename };
  };

  importArchive = (
    archive: File,
    overrideName?: string
  ): Promise<ServerCreatedResponse> => {
    const formData = new FormData();
    formData.append("archive", archive);
    if (overrideName) formData.append("name", overrideName);
    return this.authHttp.post<ServerCreatedResponse>("servers/import", {
      body: formData,
    });
  };

  start = (id: string): Promise<void> =>
    this.authHttp.post<void>(`servers/${id}/start`);

  stop = (id: string): Promise<void> =>
    this.authHttp.post<void>(`servers/${id}/stop`);

  restart = (id: string): Promise<void> =>
    this.authHttp.post<void>(`servers/${id}/restart`);

  kill = (id: string): Promise<void> =>
    this.authHttp.post<void>(`servers/${id}/kill`);

  getProperties = (id: string): Promise<Record<string, string>> =>
    this.authHttp.get<Record<string, string>>(`servers/${id}/properties`);

  saveProperties = async (
    id: string,
    properties: Record<string, string>
  ): Promise<void> => {
    await this.authHttp.raw.put(`servers/${id}/properties`, {
      json: { properties },
    });
  };

  uploadIcon = (id: string, file: File): Promise<void> => {
    const formData = new FormData();
    formData.append("icon", file);
    return this.authHttp.post<void>(`servers/${id}/icon`, {
      body: formData,
    });
  };

  updateSettings = (
    id: string,
    settings: {
      name?: string;
      restartOnError?: { enabled: boolean; attempts: number };
      variables?: Record<string, string | number | boolean>;
    }
  ): Promise<Server> =>
    this.authHttp.patch<Server>(`servers/${id}/settings`, { json: settings });
}

export const serversApi = new ServersApi(authHttp);
