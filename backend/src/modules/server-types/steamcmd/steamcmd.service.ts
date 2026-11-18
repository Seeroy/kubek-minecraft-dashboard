import { unpack } from "@/core/utils/archives";
import { download } from "@/core/utils/download";
import type { SteamCmdStep } from "@kubekpanel/blueprint-sdk";
import { Injectable, Logger } from "@nestjs/common";
import fs from "fs";
import path from "path";
import { runProcess } from "../runtime/run-process";

export const STEAMCMD_DIR = "./binaries/steamcmd";
const CDN = "https://steamcdn-a.akamaihd.net/client/installer";
const ATTEMPTS = 3;
// Big games stay quiet for a while when they verify files
const IDLE_TIMEOUT_MS = 20 * 60_000;

interface SteamCmdBundle {
  archive: string;
  binary: string;
}

export function steamCmdBundle(
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch,
): SteamCmdBundle {
  if (platform === "win32") {
    return { archive: "steamcmd.zip", binary: "steamcmd.exe" };
  }
  if (platform === "darwin") {
    return { archive: "steamcmd_osx.tar.gz", binary: "steamcmd.sh" };
  }
  if (platform === "linux") {
    // x86 only, ARM Linux can't run it
    if (arch !== "x64") {
      throw new Error("SteamCMD runs only on x86-64 Linux hosts");
    }
    return { archive: "steamcmd_linux.tar.gz", binary: "steamcmd.sh" };
  }
  throw new Error(`SteamCMD is not available for ${platform}`);
}

/** SteamCMD arguments for an anonymous app_update into installDir */
export function steamCmdArgs(
  step: Omit<SteamCmdStep, "type">,
  installDir: string,
): string[] {
  if (!/^\d+$/.test(step.appId)) {
    throw new Error(`Invalid Steam app id: ${step.appId}`);
  }
  if (step.beta && !/^[\w.-]+$/.test(step.beta)) {
    throw new Error(`Invalid Steam branch: ${step.beta}`);
  }
  if (step.betaPassword && !/^[\x21-\x7e]+$/.test(step.betaPassword)) {
    throw new Error("Invalid Steam branch password");
  }
  return [
    // Has to come before the login
    ...(step.platform ? ["+@sSteamCmdForcePlatformType", step.platform] : []),
    "+force_install_dir",
    installDir,
    "+login",
    "anonymous",
    "+app_update",
    step.appId,
    ...(step.beta ? ["-beta", step.beta] : []),
    ...(step.betaPassword ? ["-betapassword", step.betaPassword] : []),
    ...(step.validate === false ? [] : ["validate"]),
    "+quit",
  ];
}

export interface SteamCmdProgress {
  /** downloading, verifying, preallocating, committing */
  phase: string;
  percent: number;
}

const PROGRESS = /Update state \(0x[0-9a-f]+\) ([\w ]+?), progress: ([\d.]+)/i;
const SUCCESS = /Success! App '(\d+)' (fully installed|already up to date)/i;
const NO_SUBSCRIPTION = /No subscription|Missing configuration/i;

export function parseSteamCmdProgress(line: string): SteamCmdProgress | null {
  const match = PROGRESS.exec(line);
  if (!match) return null;
  return { phase: match[1].trim(), percent: Number(match[2]) };
}

/** One SteamCMD in binaries/steamcmd, shared by all servers */
@Injectable()
export class SteamCmdService {
  private readonly logger = new Logger(SteamCmdService.name);
  private installing?: Promise<string>;

  /** Path to the SteamCMD binary, downloads it the first time */
  ensureInstalled(): Promise<string> {
    this.installing ??= this.install().finally(() => {
      this.installing = undefined;
    });
    return this.installing;
  }

  private async install(): Promise<string> {
    const bundle = steamCmdBundle();
    const dir = path.resolve(STEAMCMD_DIR);
    const binary = path.join(dir, bundle.binary);
    if (fs.existsSync(binary)) return binary;

    this.logger.log("Downloading SteamCMD");
    fs.mkdirSync(dir, { recursive: true });
    const archive = path.join(dir, bundle.archive);
    await download({ url: `${CDN}/${bundle.archive}`, dest: archive });
    await unpack(archive, dir, { deleteAfter: true });
    if (!fs.existsSync(binary)) {
      throw new Error(`SteamCMD archive has no ${bundle.binary}`);
    }
    return binary;
  }

  /** Retries because the first run often only updates SteamCMD itself */
  async installApp(
    step: Omit<SteamCmdStep, "type">,
    installDir: string,
    onProgress?: (progress: SteamCmdProgress) => void,
    onLine?: (line: string) => void,
  ): Promise<void> {
    const args = steamCmdArgs(step, installDir);
    const binary = await this.ensureInstalled();

    let tail: string[] = [];
    for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
      let succeeded = false;
      let needsAccount = false;
      const result = await runProcess({
        argv: [binary, ...args],
        cwd: path.dirname(binary),
        idleTimeoutMs: IDLE_TIMEOUT_MS,
        onLine: (line) => {
          onLine?.(line);
          if (SUCCESS.test(line)) succeeded = true;
          if (NO_SUBSCRIPTION.test(line)) needsAccount = true;
          const progress = parseSteamCmdProgress(line);
          if (progress) onProgress?.(progress);
        },
      });
      tail = result.tail;
      if (succeeded) return;
      if (needsAccount) {
        throw new Error(
          `Steam app ${step.appId} can't be downloaded anonymously, it needs an account that owns it`,
        );
      }
      if (result.timedOut) {
        throw new Error("SteamCMD stopped printing anything and was stopped");
      }
      // 127: the 32-bit loader is missing
      if (result.code === 127) {
        throw new Error(
          "SteamCMD could not start, install the 32-bit libraries (lib32gcc-s1 on Debian and Ubuntu)",
        );
      }
      this.logger.warn(
        `SteamCMD attempt ${attempt} for app ${step.appId} ended with code ${result.code}`,
      );
    }
    throw new Error(
      `SteamCMD could not install app ${step.appId}:\n${tail.slice(-10).join("\n")}`,
    );
  }
}
