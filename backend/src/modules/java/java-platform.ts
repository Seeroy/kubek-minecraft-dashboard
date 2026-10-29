import * as path from "path";

/** Root of Java runtimes managed by Kubek, one folder per version */
export const JAVA_DIR = "./binaries/java";

const ADOPTIUM_ARCH: Record<string, string> = {
  arm: "arm",
  arm64: "aarch64",
  ia32: "x86",
  ppc64: "ppc64",
  riscv64: "riscv64",
  s390x: "s390x",
  x64: "x64",
};

const ADOPTIUM_OS: Record<string, string> = {
  aix: "aix",
  darwin: "mac",
  linux: "linux",
  sunos: "solaris",
  win32: "windows",
};

/** process.arch in Adoptium terms, throws for unsupported ones */
export function adoptiumArch(arch: string = process.arch): string {
  const target = ADOPTIUM_ARCH[arch];
  if (!target) {
    throw new Error(`Architecture ${arch} is not supported by Java Adoptium`);
  }
  return target;
}

/** process.platform in Adoptium terms, throws for unsupported ones */
export function adoptiumOs(platform: string = process.platform): string {
  const target = ADOPTIUM_OS[platform];
  if (!target) {
    throw new Error(`Platform ${platform} is not supported by Java Adoptium`);
  }
  return target;
}

/** Latest GA JRE build of a version for this machine */
export function adoptiumDownloadUrl(version: string): string {
  const os = adoptiumOs();
  const arch = adoptiumArch();
  return `https://api.adoptium.net/v3/binary/latest/${version}/ga/${os}/${arch}/jre/hotspot/normal/eclipse?project=jdk`;
}

/** Where a managed Java goes */
export function managedJavaPaths(version: string): {
  url: string;
  downloadPath: string;
  extractPath: string;
} {
  const arch = adoptiumArch();
  const extension = process.platform === "win32" ? ".zip" : ".tar.gz";
  return {
    url: adoptiumDownloadUrl(version),
    downloadPath: path.join(JAVA_DIR, `Java-${version}-${arch}${extension}`),
    extractPath: path.join(JAVA_DIR, version),
  };
}
