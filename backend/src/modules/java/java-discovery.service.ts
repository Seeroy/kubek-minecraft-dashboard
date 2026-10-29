import type { JavaVersion } from "@/core/types/java";
import { getErrorMessage } from "@/core/utils/error";
import { Injectable, Logger } from "@nestjs/common";
import { Glob } from "bun";
import { exec, spawn } from "child_process";
import * as fs from "fs/promises";
import * as path from "path";
import { promisify } from "util";
import { JAVA_DIR } from "./java-platform";
import {
  extractVersionNumber,
  type JavaVersionInfo,
  parseJavaVersionLine,
} from "./java-version";

// Hard cap for java -version so a bad binary never hangs a request
const JAVA_PROBE_TIMEOUT_MS = 10_000;

// Only files named like the java launcher are accepted as a binary path
const JAVA_BINARY_NAMES = new Set(["java", "java.exe"]);

export interface JavaPathValidation extends JavaVersionInfo {
  valid: boolean;
  resolvedPath?: string;
  version?: string;
  error?: string;
}

/**
 * Finds Java on disk: managed runtimes, system installs, arbitrary paths
 */
@Injectable()
export class JavaDiscovery {
  private readonly logger = new Logger(JavaDiscovery.name);

  /** Runtimes unpacked into the managed binaries dir */
  async findManagedVersions(): Promise<JavaVersion[]> {
    if (!(await this.directoryExists(JAVA_DIR))) return [];

    const installed: JavaVersion[] = [];
    for (const version of await fs.readdir(JAVA_DIR)) {
      const javaPath = await this.findJavaBinaryInDirectory(
        path.join(JAVA_DIR, version),
      );
      if (javaPath) {
        const javaInfo = await this.getJavaInfo(javaPath);
        installed.push({
          version,
          name: `Java ${version}`,
          type: "jdk",
          os: process.platform,
          arch: process.arch,
          path: javaPath,
          ...javaInfo,
        });
      }
    }
    return installed;
  }

  /** Java on PATH and in JAVA_HOME style variables */
  async findSystemJava(): Promise<JavaVersion[]> {
    const candidates: string[] = [];

    // PATH lookup via which/where
    try {
      const execAsync = promisify(exec);

      const javaExe = process.platform === "win32" ? "java.exe" : "java";
      const locate = process.platform === "win32" ? "where" : "which";
      const { stdout } = await execAsync(`${locate} ${javaExe}`);

      candidates.push(
        ...stdout
          .trim()
          .split("\n")
          .map((p) => p.trim())
          .filter(Boolean),
      );
    } catch {
      // No java on PATH, env vars below may still point somewhere
    }

    // JAVA_HOME-style env vars pointing at installation roots
    for (const home of this.javaHomesFromEnv()) {
      const binary = await this.resolveJavaBinary(home);
      if (binary) candidates.push(binary);
    }

    const versions: JavaVersion[] = [];
    const seen = new Set<string>();

    for (const javaPath of candidates) {
      try {
        // Dedupe symlinked duplicates (PATH shims vs JAVA_HOME)
        const realPath = await fs.realpath(javaPath).catch(() => javaPath);
        if (seen.has(realPath)) continue;
        seen.add(realPath);

        const javaInfo = await this.getJavaInfo(javaPath);
        if (javaInfo.runtime) {
          versions.push({
            version: extractVersionNumber(javaInfo.runtime),
            name: `System Java ${extractVersionNumber(javaInfo.runtime)}`,
            type: "jdk",
            os: process.platform,
            arch: process.arch,
            path: javaPath,
            ...javaInfo,
          });
        }
      } catch {
        // Ignore individual Java installations that fail
      }
    }

    return versions;
  }

  /** Path to a Java managed by Kubek */
  async getManagedJavaPath(version: string): Promise<string | null> {
    return this.findJavaBinaryInDirectory(path.join(JAVA_DIR, version));
  }

  /** Find Java binary (java/java.exe) in directory using glob */
  async findJavaBinaryInDirectory(
    directoryPath: string,
  ): Promise<string | null> {
    // A missing directory just means this Java isnt installed yet
    if (!(await this.directoryExists(directoryPath))) return null;

    try {
      const glob = new Glob(`**/{java,java.exe}`);
      const files: string[] = [];

      for await (const file of glob.scan(directoryPath)) {
        files.push(path.resolve(path.join(directoryPath, file)));
      }

      return files.length > 0 ? files[0] : null;
    } catch (error) {
      this.logger.error(`Failed to find Java bin: ${getErrorMessage(error)}`);
      return null;
    }
  }

  /** Java binary from a path, either the binary itself or an install folder */
  async resolveJavaBinary(inputPath: string): Promise<string | null> {
    try {
      const stat = await fs.stat(inputPath);
      if (stat.isFile()) {
        const name = path.basename(inputPath).toLowerCase();
        return JAVA_BINARY_NAMES.has(name) ? inputPath : null;
      }
      if (stat.isDirectory())
        return await this.findJavaBinaryInDirectory(inputPath);
    } catch {
      // Missing path, fall through to null
    }
    return null;
  }

  /** Path must be a real java that answers java -version */
  async validateJavaPath(inputPath: string): Promise<JavaPathValidation> {
    const trimmed = inputPath?.trim();
    if (!trimmed) return { valid: false, error: "Path is empty" };

    const binary = await this.resolveJavaBinary(trimmed);
    if (!binary) {
      return { valid: false, error: "No java binary found at the given path" };
    }

    const info = await this.getJavaInfo(binary);
    if (!info.runtime) {
      return { valid: false, error: "Failed to run java -version" };
    }

    return {
      valid: true,
      resolvedPath: binary,
      version: extractVersionNumber(info.runtime),
      ...info,
    };
  }

  /** Parse the first line of java -version, empty on failure */
  private async getJavaInfo(javaPath: string): Promise<JavaVersionInfo> {
    try {
      const java = spawn(javaPath.trim(), ["-version"], {
        stdio: ["ignore", "ignore", "pipe"],
      });

      let output = "";
      java.stderr?.on("data", (data: Buffer) => {
        output += data.toString();
      });

      // Paths can come from users, so a spawn error or a hanging binary must not escape
      const exited = await new Promise<boolean>((resolve) => {
        const timer = setTimeout(() => {
          java.kill("SIGKILL");
          resolve(false);
        }, JAVA_PROBE_TIMEOUT_MS);
        java.once("error", () => {
          clearTimeout(timer);
          resolve(false);
        });
        java.once("close", () => {
          clearTimeout(timer);
          resolve(true);
        });
      });
      if (!exited) return {};

      return parseJavaVersionLine(output.split("\n")[0]);
    } catch {
      return {};
    }
  }

  /** Installation roots taken from JAVA_HOME / JDK_HOME style environment variables */
  private javaHomesFromEnv(): string[] {
    const homes: string[] = [];
    for (const [key, value] of Object.entries(process.env)) {
      if (!value) continue;
      if (/^(JAVA|JDK|JRE)[A-Z0-9_]*_HOME$/.test(key)) homes.push(value.trim());
    }
    return [...new Set(homes.filter(Boolean))];
  }

  private async directoryExists(dir: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }
}
