import { TaskErrorCode } from "@/core/errors/error-codes";
import { CustomJavaEntry, JavaVersion } from "@/core/types/java";
import { downloadWithProgress } from "@/core/utils/downloadWithProgress";
import { generateRandomString } from "@/core/utils/randomString";
import { TasksService } from "@/modules/tasks/tasks.service";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { TaskStatus, TaskSteps } from "@shared/types/task.types";
import { type IUser, UserPermissions } from "@shared/types/user.types";
import decompress from "@xhmikosr/decompress";
import { Glob } from "bun";
import { exec, spawn } from "child_process";
import * as fs from "fs/promises";
import ky from "ky";
import * as path from "path";
import { promisify } from "util";

// Hard cap for java -version so a bad binary never hangs a request
const JAVA_PROBE_TIMEOUT_MS = 10_000;

// Only files named like the java launcher are accepted as a binary path
const JAVA_BINARY_NAMES = new Set(["java", "java.exe"]);

interface MojangVersionManifest {
  versions: { id: string; url: string }[];
}

interface MojangVersionDetail {
  javaVersion?: { majorVersion: number };
}

@Injectable()
export class JavaService {
  private readonly javaDir = "./binaries/java";
  private readonly customJavaFile = path.join(this.javaDir, "custom.json");

  constructor(private readonly tasksService: TasksService) {}

  /**
   * Get all available Java versions from Adoptium API
   * @returns Array of available Java versions
   */
  async getJavaVersions(): Promise<JavaVersion[]> {
    return this.getJavaVersionsFromAPI();
  }

  /**
   * Get all Java installations (available + installed)
   * @returns Array of all Java installations
   */
  async getAllJavaInstallations(): Promise<JavaVersion[]> {
    const [available, installed] = await Promise.all([
      this.getJavaVersions(),
      this.getInstalledJavaVersions(),
    ]);

    return [...installed, ...available];
  }

  /** Recommended major Java version for a Minecraft version, or null if unknown */
  async getJavaVersionForGame(gameVersion: string): Promise<number | null> {
    const manifest = await ky
      .get("https://launchermeta.mojang.com/mc/game/version_manifest.json")
      .json<MojangVersionManifest>();

    const versionData = manifest.versions.find(
      (version) => version.id === gameVersion,
    );

    if (!versionData) {
      throw new NotFoundException("Version not found in manifest");
    }

    const versionDetail = await ky
      .get(versionData.url)
      .json<MojangVersionDetail>();
    // Older manifests predate the javaVersion field, fallback to null
    return versionDetail.javaVersion?.majorVersion ?? null;
  }

  /**
   * Get all available Java versions from Adoptium API
   * @returns Array of available Java versions
   */
  async getJavaVersionsFromAPI(): Promise<JavaVersion[]> {
    try {
      const data = await ky
        .get("https://api.adoptium.net/v3/info/available_releases")
        .json<{ available_releases: number[] }>();
      const releases = data.available_releases;

      return releases.map((version: number) => ({
        version: version.toString(),
        name: `Java ${version}`,
        type: "jdk",
        os: this.platformToOs(),
        arch: this.archToArch(),
        downloadUrl: this.getJavaDownloadUrl(version.toString()),
      }));
    } catch (error) {
      console.error("Failed to fetch Java versions:", error);
      return [];
    }
  }

  /**
   * Get installed Java versions on the system
   * @returns Array of installed Java versions
   */
  async getInstalledJavaVersions(): Promise<JavaVersion[]> {
    try {
      const installedVersions: JavaVersion[] = [];

      // Check binaries directory
      if (await this.directoryExists(this.javaDir)) {
        const versions = await fs.readdir(this.javaDir);

        for (const version of versions) {
          const javaPath = await this.findJavaBinaryInDirectory(
            path.join(this.javaDir, version),
          );
          if (javaPath) {
            const javaInfo = await this.getJavaInfo(javaPath);
            installedVersions.push({
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
      }

      // Check system Java installations
      const systemJava = await this.findSystemJava();
      installedVersions.push(...systemJava);

      // User-registered custom installations
      const customJava = await this.getCustomJavaVersions();
      installedVersions.push(...customJava);

      return installedVersions;
    } catch (error) {
      console.error("Failed to get installed Java versions:", error);
      return [];
    }
  }

  /**
   * Install a specific Java version from Adoptium
   * @param version - Java version to install
   * @returns Success status with installation details
   */
  async installJavaVersion(
    version: string,
    taskId?: string,
    onLog?: (line: string) => void,
    options?: { manageTaskLifecycle?: boolean },
  ): Promise<{
    success: boolean;
    error?: string;
    path?: string;
  }> {
    // When false, the caller owns the task's terminal status
    const manageLifecycle = options?.manageTaskLifecycle ?? true;
    const UPDATE_INTERVAL = 200;
    let lastUpdateTime = 0;
    let lastLoggedPercent = -1;

    try {
      const existing = await this.findJavaInstallation(version);
      if (existing) {
        if (taskId && manageLifecycle)
          this.tasksService.updateTask(taskId, {
            status: TaskStatus.SUCCESS,
            step: TaskSteps.COMPLETED,
            progress: 100,
          });
        return { success: true, path: existing };
      }

      const downloadInfo = this.getJavaDownloadInfo(version);
      if (!downloadInfo) {
        return this.failTask(
          taskId,
          "Unsupported Java version or platform",
          manageLifecycle,
        );
      }

      console.log(
        `[JavaService] Java ${version} download URL:`,
        downloadInfo.url,
      );

      if (taskId) {
        this.tasksService.updateTask(taskId, {
          step: TaskSteps.DOWNLOADING_JAVA,
          progress: 0,
        });
      }

      await fs.mkdir(path.dirname(downloadInfo.downloadPath), {
        recursive: true,
      });

      onLog?.(
        `[Kubek] Java ${version} is not installed - starting download...`,
      );

      await downloadWithProgress(
        downloadInfo.url,
        downloadInfo.downloadPath,
        (progress) => {
          const now = Date.now();
          if (now - lastUpdateTime >= UPDATE_INTERVAL && taskId) {
            this.tasksService.updateTask(taskId, { progress });
            lastUpdateTime = now;
          }
          // Mirror download progress to the server log in coarse 10% increments
          const stepped = Math.floor(progress / 10) * 10;
          if (
            onLog &&
            stepped > lastLoggedPercent &&
            stepped >= 0 &&
            stepped <= 100
          ) {
            lastLoggedPercent = stepped;
            onLog(`[Kubek] Downloading Java ${version}: ${stepped}%`);
          }
        },
      );
      if (taskId) this.tasksService.updateTask(taskId, { progress: 100 });
      onLog?.(`[Kubek] Java ${version} downloaded, unpacking...`);

      if (taskId)
        this.tasksService.updateTask(taskId, {
          step: TaskSteps.UNPACKING_JAVA,
          progress: 0,
        });

      await this.extractJavaArchive(
        downloadInfo.downloadPath,
        downloadInfo.extractPath,
      );
      onLog?.(`[Kubek] Java ${version} unpacked successfully`);

      const javaPath = await this.findJavaBinaryInDirectory(
        downloadInfo.extractPath,
      );
      if (!javaPath) {
        return this.failTask(
          taskId,
          "Failed to find Java executable after extraction",
          manageLifecycle,
        );
      }

      await fs.unlink(downloadInfo.downloadPath);

      if (taskId && manageLifecycle)
        this.tasksService.updateTask(taskId, {
          status: TaskStatus.SUCCESS,
          step: TaskSteps.COMPLETED,
          progress: 100,
        });

      return { success: true, path: javaPath };
    } catch (error) {
      console.error(`Failed to install Java ${version}:`, error);
      return this.failTask(
        taskId,
        error?.message || "Failed to install Java version",
        manageLifecycle,
      );
    }
  }

  /**
   * Mark the install task as FAILED
   * @param taskId - Task to fail, if any
   * @param message - Human-readable error
   */
  private failTask(
    taskId: string | undefined,
    message: string,
    manageLifecycle = true,
  ): { success: false; error: string } {
    if (taskId && manageLifecycle) {
      this.tasksService.updateTask(taskId, {
        status: TaskStatus.FAILED,
        step: TaskSteps.FAILED,
        error: { code: TaskErrorCode.JAVA_INSTALL_ERROR, message },
      });
    }
    return { success: false, error: message };
  }

  /**
   * Get Java version information from executable
   * @param javaPath - Path to Java executable
   * @returns Java information
   */
  private async getJavaInfo(javaPath: string): Promise<{
    vendor?: string;
    build?: string;
    runtime?: string;
  }> {
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

      const lines = output.split("\n");
      const versionLine = lines[0];

      return {
        vendor: this.extractVendor(versionLine),
        build: this.extractBuild(versionLine),
        runtime: this.extractRuntime(versionLine),
      };
    } catch (error) {
      return {};
    }
  }

  /**
   * Extract vendor from Java version string
   * @param versionString - Java version output
   * @returns Vendor name
   */
  private extractVendor(versionString: string): string | undefined {
    const match = versionString.match(/"([^"]+)"/);
    return match ? match[1] : undefined;
  }

  /**
   * Extract build from Java version string
   * @param versionString - Java version output
   * @returns Build string
   */
  private extractBuild(versionString: string): string | undefined {
    const match = versionString.match(/build (\d+)/);
    return match ? match[1] : undefined;
  }

  /**
   * Extract runtime from Java version string
   * @param versionString - Java version output
   * @returns Runtime string
   */
  private extractRuntime(versionString: string): string | undefined {
    const match = versionString.match(/version "([^"]+)"/);
    return match ? match[1] : undefined;
  }

  /**
   * Find Java installation by version
   * @param version - Java version
   * @returns Java path or null
   */
  private async findJavaInstallation(version: string): Promise<string | null> {
    const javaDir = path.join(this.javaDir, version);
    return await this.findJavaBinaryInDirectory(javaDir);
  }

  private async findSystemJava(): Promise<JavaVersion[]> {
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
            version: this.extractVersionNumber(javaInfo.runtime),
            name: `System Java ${this.extractVersionNumber(javaInfo.runtime)}`,
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

  /** Installation roots taken from JAVA_HOME / JDK_HOME style environment variables */
  private javaHomesFromEnv(): string[] {
    const homes: string[] = [];
    for (const [key, value] of Object.entries(process.env)) {
      if (!value) continue;
      if (/^(JAVA|JDK|JRE)[A-Z0-9_]*_HOME$/.test(key)) homes.push(value.trim());
    }
    return [...new Set(homes.filter(Boolean))];
  }

  /**
   * Extract version number from Java version string
   * @param versionString - Java version string
   * @returns Version number
   */
  private extractVersionNumber(versionString: string): string {
    const match = versionString.match(/(\d+\.\d+\.\d+)/);
    return match ? match[1] : versionString;
  }

  /**
   * Get Java download URL for version
   * @param version - Java version
   * @returns Download URL
   */
  private getJavaDownloadUrl(version: string): string {
    const platform = this.platformToOs();
    const arch = this.archToArch();

    return `https://api.adoptium.net/v3/binary/latest/${version}/ga/${platform}/${arch}/jre/hotspot/normal/eclipse?project=jdk`;
  }

  /**
   * Get Java download information
   * @param version - Java version
   * @returns Download info or null
   */
  private getJavaDownloadInfo(version: string): {
    url: string;
    downloadPath: string;
    extractPath: string;
  } | null {
    const arch = this.archToArch();
    const extension = process.platform === "win32" ? ".zip" : ".tar.gz";

    const url = this.getJavaDownloadUrl(version);
    const downloadPath = path.join(
      this.javaDir,
      `Java-${version}-${arch}${extension}`,
    );
    const extractPath = path.join(this.javaDir, version);

    return { url, downloadPath, extractPath };
  }

  private async extractJavaArchive(
    archivePath: string,
    extractPath: string,
  ): Promise<void> {
    // Surface extraction failures instead of hanging the install forever
    await decompress(archivePath, extractPath);
  }

  private async directoryExists(dir: string): Promise<boolean> {
    try {
      const stat = await fs.stat(dir);
      return stat.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Get path to Java managed by Kubek
   */
  async getManagedJavaPath(version: string): Promise<string | null> {
    const javaDirectory = path.join(".", "binaries", "java", version);
    return await this.findJavaBinaryInDirectory(javaDirectory);
  }

  /**
   * Find Java binary (java/java.exe) in directory using glob
   */
  async findJavaBinaryInDirectory(
    directoryPath: string,
  ): Promise<string | null> {
    // A missing directory just means this Java isnt installed yet
    if (!(await this.directoryExists(directoryPath))) return null;

    try {
      const pattern = `**/{java,java.exe}`;
      const glob = new Glob(pattern);
      const files: string[] = [];

      for await (const file of glob.scan(directoryPath)) {
        const fileResultPath = path.resolve(path.join(directoryPath, file));
        files.push(fileResultPath);
      }

      return files.length > 0 ? files[0] : null;
    } catch (error) {
      console.error("Failed to find Java bin,", error);
      return null;
    }
  }

  /**
   * Resolve a java binary from an arbitrary path, a direct binary or an installation folder
   */
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

  /**
   * Strictly validate an arbitrary Java path, the binary must exist and answer java -version
   */
  async validateJavaPath(inputPath: string): Promise<{
    valid: boolean;
    resolvedPath?: string;
    version?: string;
    vendor?: string;
    build?: string;
    runtime?: string;
    error?: string;
  }> {
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
      version: this.extractVersionNumber(info.runtime),
      ...info,
    };
  }

  /** Read the custom Java registry file */
  private async loadCustomJavas(): Promise<CustomJavaEntry[]> {
    try {
      const raw = await fs.readFile(this.customJavaFile, "utf-8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async saveCustomJavas(entries: CustomJavaEntry[]): Promise<void> {
    await fs.mkdir(this.javaDir, { recursive: true });
    await fs.writeFile(this.customJavaFile, JSON.stringify(entries, null, 2));
  }

  /** Registered custom installations as JavaVersion rows */
  async getCustomJavaVersions(): Promise<JavaVersion[]> {
    const entries = await this.loadCustomJavas();
    return entries.map((entry) => ({
      version: entry.version,
      name: entry.name || `Custom Java ${entry.version}`,
      type: "jdk" as const,
      os: process.platform,
      arch: process.arch,
      path: entry.resolvedPath,
      vendor: entry.vendor,
      build: entry.build,
      runtime: entry.runtime,
      custom: true,
      id: entry.id,
    }));
  }

  /**
   * Register a custom Java installation from an arbitrary local path
   */
  async addCustomJava(inputPath: string, name?: string): Promise<JavaVersion> {
    const validation = await this.validateJavaPath(inputPath);
    if (!validation.valid || !validation.resolvedPath) {
      throw new BadRequestException(validation.error || "Invalid Java path");
    }

    const entries = await this.loadCustomJavas();
    const duplicate = entries.find(
      (e) => e.resolvedPath === validation.resolvedPath,
    );
    if (duplicate) {
      throw new BadRequestException("This Java is already registered");
    }

    const entry: CustomJavaEntry = {
      id: generateRandomString(12),
      name: name?.trim() || undefined,
      path: inputPath.trim(),
      resolvedPath: validation.resolvedPath,
      version: validation.version || "unknown",
      vendor: validation.vendor,
      build: validation.build,
      runtime: validation.runtime,
    };
    entries.push(entry);
    await this.saveCustomJavas(entries);

    return {
      version: entry.version,
      name: entry.name || `Custom Java ${entry.version}`,
      type: "jdk",
      os: process.platform,
      arch: process.arch,
      path: entry.resolvedPath,
      vendor: entry.vendor,
      build: entry.build,
      runtime: entry.runtime,
      custom: true,
      id: entry.id,
    };
  }

  /**
   * Guard a JAVA_PATH server variable, arbitrary paths need MANAGE_JAVA,
   * everyone else may only pick a registered custom installation
   */
  async assertJavaPathAllowed(
    javaPath: unknown,
    user: IUser,
    currentPath?: unknown,
  ): Promise<void> {
    if (typeof javaPath !== "string" || !javaPath.trim()) return;
    const trimmed = javaPath.trim();
    // Untouched value carried over from the stored server config
    if (typeof currentPath === "string" && currentPath.trim() === trimmed)
      return;
    if (user.permissions.includes(UserPermissions.MANAGE_JAVA)) return;

    const entries = await this.loadCustomJavas();
    const registered = entries.some(
      (e) => e.resolvedPath === trimmed || e.path === trimmed,
    );
    if (!registered) {
      throw new ForbiddenException(
        "Custom Java paths require MANAGE_JAVA, pick a registered installation",
      );
    }
  }

  /** Unregister a custom Java, files on disk are left untouched */
  async removeCustomJava(id: string): Promise<void> {
    const entries = await this.loadCustomJavas();
    const next = entries.filter((e) => e.id !== id);
    if (next.length === entries.length) {
      throw new NotFoundException("Custom Java not found");
    }
    await this.saveCustomJavas(next);
  }

  /**
   * Convert process.arch to Adoptium required arch
   */
  private archToArch() {
    const archMap: { [key: string]: string } = {
      arm: "arm",
      arm64: "aarch64",
      ia32: "x86",
      ppc64: "ppc64",
      riscv64: "riscv64",
      s390x: "s390x",
      x64: "x64",
    };

    const targetArch = archMap[process.arch];

    if (!targetArch) {
      throw new Error(
        `Architecture ${process.arch} is not supported by Java Adoptium`,
      );
    }

    return targetArch;
  }

  /**
   * Delete an installed Java version
   * @param version - Java version to delete
   * @returns Success status
   */
  async deleteJavaVersion(
    version: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const installedVersions = await this.getInstalledJavaVersions();
      const versionToDelete = installedVersions.find(
        (v) => v.version === version,
      );

      if (!versionToDelete) {
        return {
          success: false,
          error: "Java version not found or not installed",
        };
      }

      // Don't allow deleting system Java
      if (versionToDelete.name?.startsWith("System ")) {
        return {
          success: false,
          error: "Cannot delete system Java installation",
        };
      }

      // Custom installations are unregistered via removeCustomJava instead
      if (versionToDelete.custom) {
        return {
          success: false,
          error: "Custom Java is removed via the custom registry",
        };
      }

      const versionPath = path.join(this.javaDir, version);
      await fs.rm(versionPath, { recursive: true, force: true });

      return { success: true };
    } catch (error) {
      console.error(`Failed to delete Java ${version}:`, error);
      return {
        success: false,
        error: error.message || "Failed to delete Java version",
      };
    }
  }

  /**
   * Convert process.platform to Adoptium required os
   */
  private platformToOs() {
    const platformMap: { [key: string]: string } = {
      aix: "aix",
      darwin: "mac",
      linux: "linux",
      sunos: "solaris",
      win32: "windows",
    };

    const targetOS = platformMap[process.platform];

    if (!targetOS) {
      throw new Error(
        `Platform ${process.platform} is not supported by Java Adoptium`,
      );
    }

    return targetOS;
  }
}
