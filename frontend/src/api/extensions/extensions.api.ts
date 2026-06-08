import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type { Capability } from "@kubekpanel/extension-sdk";
import type {
  ExtensionRegistryEntry,
  InstalledExtension,
} from "./extensions.model";

export class ExtensionsApi {
  constructor(private authHttp: AuthHttpClient) {}

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
}

export const extensionsApi = new ExtensionsApi(authHttp);
