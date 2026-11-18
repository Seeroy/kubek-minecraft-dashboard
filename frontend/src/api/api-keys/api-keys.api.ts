import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type { ApiKey, CreateApiKeyDto, CreatedApiKey, McpSettings, UpdateApiKeyDto } from "./api-keys.model";

export class ApiKeysApi {
  constructor(private authHttp: AuthHttpClient) {}

  list = (): Promise<ApiKey[]> => this.authHttp.get<ApiKey[]>("api-keys");

  listAll = (): Promise<ApiKey[]> => this.authHttp.get<ApiKey[]>("api-keys/all");

  create = (data: CreateApiKeyDto): Promise<CreatedApiKey> => this.authHttp.post<CreatedApiKey>("api-keys", { json: data });

  update = (id: string, data: UpdateApiKeyDto): Promise<ApiKey> => this.authHttp.patch<ApiKey>(`api-keys/${encodeURIComponent(id)}`, { json: data });

  delete = (id: string): Promise<void> => this.authHttp.delete<void>(`api-keys/${encodeURIComponent(id)}`);

  mcpSettings = (): Promise<McpSettings> => this.authHttp.get<McpSettings>("mcp/settings");

  setMcpSettings = (data: McpSettings): Promise<McpSettings> => this.authHttp.put<McpSettings>("mcp/settings", { json: data });
}

export const apiKeysApi = new ApiKeysApi(authHttp);
