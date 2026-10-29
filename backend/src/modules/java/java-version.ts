export interface JavaVersionInfo {
  vendor?: string;
  build?: string;
  runtime?: string;
}

/** Vendor, build and runtime from the first line of java -version */
export function parseJavaVersionLine(line: string): JavaVersionInfo {
  return {
    vendor: line.match(/"([^"]+)"/)?.[1],
    build: line.match(/build (\d+)/)?.[1],
    runtime: line.match(/version "([^"]+)"/)?.[1],
  };
}

/** x.y.z from a runtime string, or the string itself */
export function extractVersionNumber(versionString: string): string {
  const match = versionString.match(/(\d+\.\d+\.\d+)/);
  return match ? match[1] : versionString;
}
