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
  custom?: boolean;
  id?: string;
}

/** A user-registered Java installation living outside the managed binaries dir */
export interface CustomJavaEntry {
  id: string;
  name?: string;
  /** Path as entered by the user, a folder or the java binary itself */
  path: string;
  /** Resolved java binary inside path, refreshed on registration */
  resolvedPath: string;
  version: string;
  vendor?: string;
  build?: string;
  runtime?: string;
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
