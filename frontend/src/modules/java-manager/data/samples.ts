import type { JavaVersion } from "@/api/java/java.model";

const java = (version: string, installed: boolean): JavaVersion => ({
  version,
  name: `Temurin ${version}`,
  type: "jdk",
  os: "linux",
  arch: "x64",
  path: installed ? `/opt/java/jdk-${version}` : undefined,
  vendor: "Eclipse Adoptium",
  runtime: installed ? `${version}+7-LTS` : undefined,
});

export const SAMPLE_JAVA: JavaVersion[] = [java("21", true), java("17", true), java("8", true), java("23", false), java("11", false)];
