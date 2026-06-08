import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type { JavaVersion } from "./java.model";

export class JavaApi {
  constructor(private authHttp: AuthHttpClient) {}

  getAllJavaVersions = (): Promise<JavaVersion[]> =>
    this.authHttp.get<JavaVersion[]>("java");

  getJavaVersionForGame = (gameVersion: string): Promise<number | null> =>
    this.authHttp.get<number | null>(`java/${gameVersion}`);

  installJavaVersion = (version: string): Promise<{ taskId: string }> =>
    this.authHttp.post<{ taskId: string }>(`java/install/${version}`);

  deleteJavaVersion = (version: string): Promise<void> =>
    this.authHttp.delete<void>(`java/${version}`);
}

export const javaApi = new JavaApi(authHttp);
