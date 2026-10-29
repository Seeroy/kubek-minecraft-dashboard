import type { CustomJavaEntry, JavaVersion } from "@/core/types/java";
import { generateRandomString } from "@/core/utils/randomString";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import * as fs from "fs/promises";
import * as path from "path";
import { JavaDiscovery } from "./java-discovery.service";
import { JAVA_DIR } from "./java-platform";

const CUSTOM_JAVA_FILE = path.join(JAVA_DIR, "custom.json");

function toJavaVersion(entry: CustomJavaEntry): JavaVersion {
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
 * User-registered Java installations kept in binaries/java/custom.json
 */
@Injectable()
export class CustomJavaStore {
  constructor(private readonly discovery: JavaDiscovery) {}

  /** Registered custom installations as JavaVersion rows */
  async list(): Promise<JavaVersion[]> {
    return (await this.load()).map(toJavaVersion);
  }

  /** Path is a registered binary or the path it was added by */
  async isRegistered(javaPath: string): Promise<boolean> {
    const entries = await this.load();
    return entries.some(
      (e) => e.resolvedPath === javaPath || e.path === javaPath,
    );
  }

  /** Register a custom Java installation from an arbitrary local path */
  async add(inputPath: string, name?: string): Promise<JavaVersion> {
    const validation = await this.discovery.validateJavaPath(inputPath);
    if (!validation.valid || !validation.resolvedPath) {
      throw new BadRequestException(validation.error || "Invalid Java path");
    }

    const entries = await this.load();
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
    await this.save(entries);

    return toJavaVersion(entry);
  }

  /** Unregister a custom Java, files on disk are left untouched */
  async remove(id: string): Promise<void> {
    const entries = await this.load();
    const next = entries.filter((e) => e.id !== id);
    if (next.length === entries.length) {
      throw new NotFoundException("Custom Java not found");
    }
    await this.save(next);
  }

  private async load(): Promise<CustomJavaEntry[]> {
    try {
      const raw = await fs.readFile(CUSTOM_JAVA_FILE, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as CustomJavaEntry[]) : [];
    } catch {
      return [];
    }
  }

  private async save(entries: CustomJavaEntry[]): Promise<void> {
    await fs.mkdir(JAVA_DIR, { recursive: true });
    await fs.writeFile(CUSTOM_JAVA_FILE, JSON.stringify(entries, null, 2));
  }
}
