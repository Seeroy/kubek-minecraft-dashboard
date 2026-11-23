import { authHttp, baseHttp, type AuthHttpClient, type BaseHttpClient } from "@/shared/lib/http";
import type { Capability } from "@kubekpanel/extension-sdk";
import type {
  CatalogExtension,
  CatalogReadmeResponse,
  CatalogResponse,
  ExtensionCommand,
  ExtensionRegistryEntry,
  ExtensionSettingsResponse,
  ExtensionSettingsUpdate,
  InstalledExtension,
} from "./extensions.model";

export class ExtensionsApi {
  constructor(
    private authHttp: AuthHttpClient,
    private publicHttp: BaseHttpClient
  ) {}

  list = (): Promise<InstalledExtension[]> =>
    this.authHttp.get<InstalledExtension[]>("extensions");

  registry = (): Promise<ExtensionRegistryEntry[]> =>
    this.authHttp.get<ExtensionRegistryEntry[]>("extensions/registry");

  install = (file: File): Promise<InstalledExtension> => {
    const formData = new FormData();
    formData.append("file", file);
    return this.authHttp.post<InstalledExtension>("extensions", {
      body: formData,
    });
  };

  catalog = (refresh = false): Promise<CatalogResponse<CatalogExtension>> =>
    this.authHttp.get<CatalogResponse<CatalogExtension>>(`extensions/catalog${refresh ? "?refresh=true" : ""}`);

  // Downloads on the server can take a while on a slow link
  catalogReadme = (id: string, lang: string): Promise<CatalogReadmeResponse> =>
    this.authHttp.get<CatalogReadmeResponse>(`extensions/catalog/${encodeURIComponent(id)}/readme?lang=${lang}`);

  installFromCatalog = (id: string): Promise<InstalledExtension> =>
    this.authHttp.post<InstalledExtension>(`extensions/catalog/${encodeURIComponent(id)}/install`, { timeout: 120_000 });

  consent = (id: string, capabilities: Capability[]): Promise<void> =>
    this.authHttp.post<void>(`extensions/${encodeURIComponent(id)}/consent`, {
      json: { capabilities },
    });

  enable = (id: string): Promise<InstalledExtension> =>
    this.authHttp.post<InstalledExtension>(
      `extensions/${encodeURIComponent(id)}/enable`
    );

  disable = (id: string): Promise<InstalledExtension> =>
    this.authHttp.post<InstalledExtension>(
      `extensions/${encodeURIComponent(id)}/disable`
    );

  remove = (id: string): Promise<void> =>
    this.authHttp.delete<void>(`extensions/${encodeURIComponent(id)}`);

  fetchAsset = (apiPath: string): Promise<string> =>
    this.authHttp.raw.get(apiPath.replace(/^\/api\//, "")).text();

  // Login page has no session yet, so no token and no session reset on 401
  fetchPublicAsset = (apiPath: string): Promise<string> =>
    this.publicHttp.raw.get(apiPath.replace(/^\/api\//, "")).text();

  /** login.footer slots, public */
  loginSlots = (): Promise<ExtensionRegistryEntry[]> =>
    this.publicHttp.get<ExtensionRegistryEntry[]>("extensions/login-slots");

  commands = (): Promise<ExtensionCommand[]> =>
    this.authHttp.get<ExtensionCommand[]>("extensions/commands");

  runCommand = (extId: string, commandId: string): Promise<void> =>
    this.authHttp.post<void>(`extensions/${encodeURIComponent(extId)}/commands/${encodeURIComponent(commandId)}/run`);

  settings = (id: string): Promise<ExtensionSettingsResponse> =>
    this.authHttp.get<ExtensionSettingsResponse>(`extensions/${encodeURIComponent(id)}/settings`);

  updateSettings = (id: string, body: ExtensionSettingsUpdate): Promise<ExtensionSettingsResponse | undefined> =>
    this.authHttp.put<ExtensionSettingsResponse | undefined>(`extensions/${encodeURIComponent(id)}/settings`, { json: body });
}

export const extensionsApi = new ExtensionsApi(authHttp, baseHttp);
