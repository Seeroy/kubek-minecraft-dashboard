import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type { KubekConfig, UpdateCheckResult } from "./kubek.model";

export class KubekApi {
  constructor(private authHttp: AuthHttpClient) {}

  getVersion = (): Promise<string> =>
    this.authHttp.get<string>("kubek/version");

  checkForUpdates = (): Promise<UpdateCheckResult> =>
    this.authHttp.get<UpdateCheckResult>("kubek/updates");

  getConfig = (): Promise<KubekConfig> =>
    this.authHttp.get<KubekConfig>("kubek/config");

  updateConfig = (config: KubekConfig): Promise<void> =>
    this.authHttp.put<void>("kubek/config", { json: config });

  acceptEULA = (): Promise<void> => this.authHttp.get<void>("kubek/acceptEULA");
}

export const kubekApi = new KubekApi(authHttp);
