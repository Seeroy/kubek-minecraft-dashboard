import { TaskErrorCode } from "@/core/errors/error-codes";
import { JavaVersion } from "@/core/types/java";
import { downloadWithProgress } from "@/core/utils/downloadWithProgress";
import { TasksService } from "@/modules/tasks/tasks.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import { TaskStatus, TaskSteps } from "@shared/types/task.types";
import decompress from "@xhmikosr/decompress";
import { Glob } from "bun";
import { exec, spawn } from "child_process";
import * as fs from "fs/promises";
import ky from "ky";
import * as path from "path";
import { promisify } from "util";

interface MojangVersionManifest {
  versions: { id: string; url: string }[];
}

interface MojangVersionDetail {
  javaVersion?: { majorVersion: number };
}

@Injectable()
export class JavaService {
  private readonly javaDir = "./binaries/java";

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
      const java = spawn(javaPath.trim(), ["-version"]);

      let output = "";
      java.stderr.on("data", (data: Buffer) => {
        output += data.toString();
      });

      await new Promise((resolve) => {
        java.on("close", resolve);
      });

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
    try {
      const execAsync = promisify(exec);

      const javaExe = process.platform === "win32" ? "java.exe" : "java";
      const locate = process.platform === "win32" ? "where" : "which";
      const { stdout } = await execAsync(`${locate} ${javaExe}`);

      const paths = stdout
        .trim()
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean);
      const versions: JavaVersion[] = [];

      for (const javaPath of paths) {
        try {
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
    } catch {
      return [];
    }
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
