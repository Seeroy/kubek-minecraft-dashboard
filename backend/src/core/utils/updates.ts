import { Logger } from "@nestjs/common";
import { readFileSync } from "fs";
import ky, { HTTPError } from "ky";
import { join } from "path";

const logger = new Logger("UpdateCheck");

export interface UpdateCheckResult {
  updateAvailable: boolean;
  latestVersion: string;
  releaseNotes: string;
}

/**
 * Get Kubek version.
 * @returns Version string
 */
export function getVersion(): string {
  // Injected at compile time by the build script
  if (process.env.KUBEK_VERSION) return process.env.KUBEK_VERSION;

  try {
    const packageJsonPath = join(process.cwd(), "package.json");
    const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
    return packageJson.version || "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/**
 * Check for updates on GitHub.
 * @returns Update information
 */
export async function checkForUpdates(): Promise<UpdateCheckResult> {
  const currentVersion = getVersion();

  try {
    const latestRelease = await ky
      .get(
        "https://api.github.com/repos/Seeroy/kubek-minecraft-dashboard/releases/latest",
        { timeout: 6000 },
      )
      .json<{ tag_name: string; body?: string }>();

    const latestVersion = latestRelease.tag_name.replace(/^v/, "");
    const releaseNotes = latestRelease.body || "No release notes available.";

    const updateAvailable = isVersionNewer(latestVersion, currentVersion);

    return {
      updateAvailable,
      latestVersion,
      releaseNotes,
    };
  } catch (error) {
    // GitHub being unreachable
    const reason =
      error instanceof HTTPError
        ? error.response.status === 403
          ? "GitHub API rate limit exceeded"
          : error.response.status === 404
            ? "Repository or release not found"
            : error.message
        : error instanceof Error
          ? error.message
          : "unknown error";
    logger.warn(`Update check skipped: ${reason}`);

    return {
      updateAvailable: false,
      latestVersion: currentVersion,
      releaseNotes: "",
    };
  }
}

/**
 * Compares versions numbers.
 * @returns Boolean comparsion result
 */
function isVersionNewer(latest: string, current: string): boolean {
  const latestParts = latest.split(".").map(Number);
  const currentParts = current.split(".").map(Number);

  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const latestPart = latestParts[i] || 0;
    const currentPart = currentParts[i] || 0;

    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }

  return false;
}
