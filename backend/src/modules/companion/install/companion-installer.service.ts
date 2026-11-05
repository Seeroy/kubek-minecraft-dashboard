import { ApiErrorCode } from "@/core/errors/error-codes";
import { download } from "@/core/utils/download";
import {
  getServerContentPath,
  getSafeServerPath,
} from "@/core/utils/serverPath";
import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { promises as fs } from "fs";
import ky from "ky";
import { join } from "path";
import {
  COMPANION_ASSET,
  COMPANION_PLUGIN_NAME,
  COMPANION_REPO,
  COMPANION_REPO_URL,
} from "../companion.constants";
import {
  readPluginDescriptor,
  type PluginDescriptor,
} from "./plugin-descriptor";
import { compareVersions } from "./version";

const PLUGINS_FOLDER = "plugins";
const RELEASE_TTL_MS = 30 * 60_000;
// GitHub hiccups shouldn't be asked again on every page load
const RELEASE_ERROR_TTL_MS = 5 * 60_000;
const MAX_JAR_BYTES = 20 * 1024 * 1024;

export interface InstalledCompanion {
  fileName: string;
  version: string;
}

export interface CompanionRelease {
  version: string;
  assetName: string;
  assetUrl: string;
  sha256?: string;
  publishedAt: string;
  url: string;
}

interface GithubRelease {
  tag_name: string;
  html_url: string;
  published_at: string;
  draft: boolean;
  prerelease: boolean;
  assets: {
    name: string;
    browser_download_url: string;
    digest?: string | null;
  }[];
}

/** Finds the plugin in a server's plugins folder and installs it from GitHub releases */
@Injectable()
export class CompanionInstallerService {
  private readonly logger = new Logger(CompanionInstallerService.name);
  private release: { value: CompanionRelease | null; until: number } | null =
    null;
  // Jar path -> descriptor, keyed by size and mtime so a replaced file is read again
  private readonly descriptors = new Map<
    string,
    { stamp: string; descriptor: PluginDescriptor | null }
  >();

  /** Installed companion, by its plugin.yml name so a renamed jar still counts */
  async detect(serverId: string): Promise<InstalledCompanion | null> {
    return (await this.findAll(serverId))[0] ?? null;
  }

  /** Latest published release, null when there is none or GitHub is down */
  async latest(): Promise<CompanionRelease | null> {
    if (this.release && this.release.until > Date.now())
      return this.release.value;
    try {
      const value = await this.fetchLatest();
      this.release = { value, until: Date.now() + RELEASE_TTL_MS };
    } catch (e) {
      this.logger.warn(`Companion release check failed: ${String(e)}`);
      this.release = { value: null, until: Date.now() + RELEASE_ERROR_TTL_MS };
    }
    return this.release.value;
  }

  /** True when the release is newer than what is installed */
  isOutdated(
    installed: InstalledCompanion,
    release: CompanionRelease | null,
  ): boolean {
    return !!release && compareVersions(release.version, installed.version) > 0;
  }

  /** Downloads the latest release and replaces any older copy */
  async install(serverId: string): Promise<InstalledCompanion> {
    const release = await this.latest();
    if (!release) {
      throw new ServiceUnavailableException({
        code: ApiErrorCode.COMPANION_RELEASE_UNAVAILABLE,
        message: "Kubek Companion release is not available right now",
      });
    }

    const folder = getSafeServerPath(serverId, PLUGINS_FOLDER);
    await fs.mkdir(folder, { recursive: true });
    const temp = getServerContentPath(
      serverId,
      PLUGINS_FOLDER,
      `.kubek-companion-${Date.now()}.download`,
    );

    try {
      await download({
        url: release.assetUrl,
        dest: temp,
        maxBytes: MAX_JAR_BYTES,
        timeout: 120_000,
        hashes: release.sha256 ? { sha256: release.sha256 } : undefined,
        label: release.assetName,
      });
      // A release with a wrong jar must not replace a working one
      const descriptor = await readPluginDescriptor(temp);
      if (descriptor?.name !== COMPANION_PLUGIN_NAME) {
        throw new Error("Downloaded file is not the Kubek Companion plugin");
      }

      for (const old of await this.findAll(serverId)) {
        if (old.fileName !== release.assetName) {
          await fs.rm(join(folder, old.fileName), { force: true });
        }
      }
      const target = getServerContentPath(
        serverId,
        PLUGINS_FOLDER,
        release.assetName,
      );
      await fs.rename(temp, target);
      return { fileName: release.assetName, version: descriptor.version };
    } finally {
      await fs.rm(temp, { force: true }).catch(() => undefined);
    }
  }

  private async findAll(serverId: string): Promise<InstalledCompanion[]> {
    const folder = getSafeServerPath(serverId, PLUGINS_FOLDER);
    let names: string[];
    try {
      names = await fs.readdir(folder);
    } catch {
      return [];
    }

    const found: InstalledCompanion[] = [];
    for (const name of names) {
      if (!name.toLowerCase().endsWith(".jar")) continue;
      const descriptor = await this.descriptor(join(folder, name));
      if (descriptor?.name === COMPANION_PLUGIN_NAME) {
        found.push({ fileName: name, version: descriptor.version });
      }
    }
    // Newest first, in case an update left an old copy behind
    return found.sort((a, b) => compareVersions(b.version, a.version));
  }

  private async descriptor(path: string): Promise<PluginDescriptor | null> {
    let stamp: string;
    try {
      const stat = await fs.stat(path);
      if (!stat.isFile()) return null;
      stamp = `${stat.size}:${stat.mtimeMs}`;
    } catch {
      return null;
    }
    const cached = this.descriptors.get(path);
    if (cached?.stamp === stamp) return cached.descriptor;
    const descriptor = await readPluginDescriptor(path);
    this.descriptors.set(path, { stamp, descriptor });
    return descriptor;
  }

  private async fetchLatest(): Promise<CompanionRelease | null> {
    const response = await ky.get(
      `https://api.github.com/repos/${COMPANION_REPO}/releases/latest`,
      {
        timeout: 8000,
        throwHttpErrors: false,
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": "kubek-panel",
        },
      },
    );
    // No release published yet
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`GitHub answered ${response.status}`);

    const release = await response.json<GithubRelease>();
    const asset = release.assets.find((a) => COMPANION_ASSET.test(a.name));
    if (!asset) return null;
    const digest = asset.digest?.startsWith("sha256:")
      ? asset.digest.slice("sha256:".length)
      : undefined;
    return {
      version: release.tag_name.replace(/^v/, ""),
      assetName: asset.name,
      assetUrl: asset.browser_download_url,
      sha256: digest,
      publishedAt: release.published_at,
      url: release.html_url || `${COMPANION_REPO_URL}/releases`,
    };
  }
}
