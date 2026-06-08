export interface JavaVersion {
  version: string;
  name: string;
  type: "jdk" | "jre";
  os: string;
  arch: string;
  path?: string;
  vendor?: string;
  build?: string;
  runtime?: string;
  downloadUrl?: string;
}

export interface JavaInstallation {
  version: string;
  name: string;
  type: "jdk" | "jre";
  os: string;
  arch: string;
  path: string;
  vendor?: string;
  build?: string;
  runtime?: string;
}
