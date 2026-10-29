import type { JavaVersion } from "@/core/types/java";
import { getErrorMessage } from "@/core/utils/error";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { AccessArea } from "@shared/access/areas";
import { can } from "@shared/access/can";
import type { IUser } from "@shared/types/user.types";
import * as fs from "fs/promises";
import * as path from "path";
import { CustomJavaStore } from "./custom-java.store";
import { JavaCatalog } from "./java-catalog.service";
import {
  JavaDiscovery,
  type JavaPathValidation,
} from "./java-discovery.service";
import {
  type JavaInstallOptions,
  type JavaInstallResult,
  JavaInstaller,
} from "./java-installer.service";
import { JAVA_DIR } from "./java-platform";

/**
 * What other modules use, passes calls to catalog, discovery, installer and custom store
 */
@Injectable()
export class JavaService {
  private readonly logger = new Logger(JavaService.name);

  constructor(
    private readonly catalog: JavaCatalog,
    private readonly discovery: JavaDiscovery,
    private readonly installer: JavaInstaller,
    private readonly customJava: CustomJavaStore,
  ) {}

  /** Java versions available for download from Adoptium */
  getJavaVersions(): Promise<JavaVersion[]> {
    return this.catalog.getAvailableVersions();
  }

  /** Installed first, then the downloadable ones */
  async getAllJavaInstallations(): Promise<JavaVersion[]> {
    const [available, installed] = await Promise.all([
      this.getJavaVersions(),
      this.getInstalledJavaVersions(),
    ]);

    return [...installed, ...available];
  }

  /** Recommended major Java version for a Minecraft version, or null if unknown */
  getJavaVersionForGame(gameVersion: string): Promise<number | null> {
    return this.catalog.getJavaVersionForGame(gameVersion);
  }

  /** Managed, system and custom installations */
  async getInstalledJavaVersions(): Promise<JavaVersion[]> {
    try {
      return [
        ...(await this.discovery.findManagedVersions()),
        ...(await this.discovery.findSystemJava()),
        ...(await this.customJava.list()),
      ];
    } catch (error) {
      this.logger.error(
        `Failed to get installed Java versions: ${getErrorMessage(error)}`,
      );
      return [];
    }
  }

  /** Install a specific Java version from Adoptium */
  installJavaVersion(
    version: string,
    taskId?: string,
    onLog?: (line: string) => void,
    options?: JavaInstallOptions,
  ): Promise<JavaInstallResult> {
    return this.installer.install(version, taskId, onLog, options);
  }

  getManagedJavaPath(version: string): Promise<string | null> {
    return this.discovery.getManagedJavaPath(version);
  }

  resolveJavaBinary(inputPath: string): Promise<string | null> {
    return this.discovery.resolveJavaBinary(inputPath);
  }

  validateJavaPath(inputPath: string): Promise<JavaPathValidation> {
    return this.discovery.validateJavaPath(inputPath);
  }

  addCustomJava(inputPath: string, name?: string): Promise<JavaVersion> {
    return this.customJava.add(inputPath, name);
  }

  removeCustomJava(id: string): Promise<void> {
    return this.customJava.remove(id);
  }

  // Arbitrary JAVA_PATH needs java manage, others pick a registered installation
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
    if (can(user, AccessArea.JAVA, "manage")) return;

    if (!(await this.customJava.isRegistered(trimmed))) {
      throw new ForbiddenException(
        "Custom Java paths require java manage access, pick a registered installation",
      );
    }
  }

  /** Delete a managed Java, system and custom ones can't be deleted here */
  async deleteJavaVersion(version: string): Promise<void> {
    const installedVersions = await this.getInstalledJavaVersions();
    const versionToDelete = installedVersions.find(
      (v) => v.version === version,
    );

    if (!versionToDelete) {
      throw new NotFoundException("Java version not found or not installed");
    }

    // Don't allow deleting system Java
    if (versionToDelete.name?.startsWith("System ")) {
      throw new BadRequestException("Cannot delete system Java installation");
    }

    // Custom installations are unregistered via removeCustomJava instead
    if (versionToDelete.custom) {
      throw new BadRequestException(
        "Custom Java is removed via the custom registry",
      );
    }

    await fs.rm(path.join(JAVA_DIR, version), {
      recursive: true,
      force: true,
    });
  }
}
