import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type {
  BlueprintSummary,
  CatalogBlueprint,
  CatalogResponse,
  ServerTypeInstallResponse,
} from "./server-types.model";

export class ServerTypesApi {
  constructor(private authHttp: AuthHttpClient) {}

  list = (): Promise<BlueprintSummary[]> =>
    this.authHttp.get<BlueprintSummary[]>("server-types");

  getVersions = (id: string): Promise<string[]> =>
    this.authHttp.get<string[]>(
      `server-types/${encodeURIComponent(id)}/versions`
    );

  /** Install a blueprint from an uploaded .kbp/.json file */
  install = (file: File): Promise<ServerTypeInstallResponse> => {
    const formData = new FormData();
    formData.append("file", file);
    return this.authHttp.post<ServerTypeInstallResponse>("server-types", {
      body: formData,
    });
  };

  catalog = (refresh = false): Promise<CatalogResponse<CatalogBlueprint>> =>
    this.authHttp.get<CatalogResponse<CatalogBlueprint>>(`server-types/catalog${refresh ? "?refresh=true" : ""}`);

  // Downloads on the server can take a while on a slow link
  installFromCatalog = (id: string): Promise<ServerTypeInstallResponse> =>
    this.authHttp.post<ServerTypeInstallResponse>(`server-types/catalog/${encodeURIComponent(id)}/install`, { timeout: 120_000 });

  remove = (id: string): Promise<void> =>
    this.authHttp.delete<void>(`server-types/${encodeURIComponent(id)}`);
}

export const serverTypesApi = new ServerTypesApi(authHttp);
