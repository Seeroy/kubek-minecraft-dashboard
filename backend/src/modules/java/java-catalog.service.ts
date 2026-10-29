import type { JavaVersion } from "@/core/types/java";
import { getErrorMessage } from "@/core/utils/error";
import { Injectable, Logger } from "@nestjs/common";
import ky from "ky";
import { adoptiumArch, adoptiumDownloadUrl, adoptiumOs } from "./java-platform";

interface MojangVersionManifest {
  versions: { id: string; url: string }[];
}

interface MojangVersionDetail {
  javaVersion?: { majorVersion: number };
}

/**
 * Remote catalogs: Java releases from Adoptium, required Java from Mojang
 */
@Injectable()
export class JavaCatalog {
  private readonly logger = new Logger(JavaCatalog.name);

  /** Adoptium releases for this platform, empty if it's down */
  async getAvailableVersions(): Promise<JavaVersion[]> {
    try {
      const data = await ky
        .get("https://api.adoptium.net/v3/info/available_releases")
        .json<{ available_releases: number[] }>();

      return data.available_releases.map((version: number) => ({
        version: version.toString(),
        name: `Java ${version}`,
        type: "jdk",
        os: adoptiumOs(),
        arch: adoptiumArch(),
        downloadUrl: adoptiumDownloadUrl(version.toString()),
      }));
    } catch (error) {
      this.logger.error(
        `Failed to fetch Java versions: ${getErrorMessage(error)}`,
      );
      return [];
    }
  }

  /** Recommended major Java version for a Minecraft version, or null if unknown */
  async getJavaVersionForGame(gameVersion: string): Promise<number | null> {
    const manifest = await ky
      .get("https://launchermeta.mojang.com/mc/game/version_manifest.json")
      .json<MojangVersionManifest>();

    const versionData = manifest.versions.find(
      (version) => version.id === gameVersion,
    );

    // Proxies and Bedrock have their own version numbers, Mojang doesn't know them
    if (!versionData) return null;

    const versionDetail = await ky
      .get(versionData.url)
      .json<MojangVersionDetail>();
    // Older manifests predate the javaVersion field, fallback to null
    return versionDetail.javaVersion?.majorVersion ?? null;
  }
}
