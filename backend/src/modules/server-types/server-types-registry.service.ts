import type {
  KubekBlueprintManifest,
  KubekPlatform,
  VersionResolver,
} from "@kubekpanel/blueprint-sdk";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join, resolve, sep } from "path";
import semver from "semver";
import { BUNDLED_BLUEPRINTS } from "./bundled";
import type { LoadedBlueprint } from "./server-types.types";

const KUBEK_VERSION = "4.0.0";
const SUPPORTED_VERSION_KINDS = ["none", "static", "http", "resolver"];
const SUPPORTED_RUNTIME_KINDS = ["native", "docker"];

/**
 * Holds bundled and user-installed blueprints
 */
@Injectable()
export class ServerTypesRegistry implements OnModuleInit {
  private readonly logger = new Logger(ServerTypesRegistry.name);
  private readonly blueprints = new Map<string, LoadedBlueprint>();
  private readonly installedDir = resolve("blueprints");

  onModuleInit(): void {
    this.loadAll();
  }

  loadAll(): void {
    this.blueprints.clear();
    this.loadBundled();
    this.loadInstalled();
    const valid = [...this.blueprints.values()].filter((b) => b.valid).length;
    this.logger.log(
      `Loaded ${this.blueprints.size} blueprint(s), ${valid} valid`,
    );
  }

  /** Re-scan bundled + installed blueprints (after an install/uninstall) */
  reload(): void {
    this.loadAll();
  }

  /** Root directory user-installed blueprints live in */
  get installedRoot(): string {
    return this.installedDir;
  }

  private loadBundled(): void {
    for (const { manifest, resolver } of BUNDLED_BLUEPRINTS) {
      this.register(manifest, __dirname, "bundled", resolver);
    }
  }

  private loadInstalled(): void {
    if (!existsSync(this.installedDir)) return;
    for (const entry of readdirSync(this.installedDir)) {
      const dir = join(this.installedDir, entry);
      if (!statSync(dir).isDirectory()) continue;
      const manifest = join(dir, "blueprint.json");
      if (existsSync(manifest)) this.loadOne(manifest, dir, "installed");
    }
  }

  private loadOne(
    manifestPath: string,
    dir: string,
    source: "bundled" | "installed",
  ): void {
    try {
      const manifest = JSON.parse(
        readFileSync(manifestPath, "utf-8"),
      ) as KubekBlueprintManifest;
      this.register(manifest, dir, source);
    } catch (e) {
      this.logger.error(
        `Failed to load blueprint at ${manifestPath}: ${(e as Error).message}`,
      );
    }
  }

  /** Validate and add a blueprint, keeping the first when ids collide (bundled before installed) */
  private register(
    manifest: KubekBlueprintManifest,
    dir: string,
    source: "bundled" | "installed",
    resolver?: VersionResolver,
  ): void {
    const errors = this.validate(manifest);
    if (this.blueprints.has(manifest.id)) {
      this.logger.warn(
        `Duplicate blueprint id "${manifest.id}" (${source}), keeping first`,
      );
      return;
    }
    this.blueprints.set(manifest.id, {
      manifest,
      dir,
      source,
      valid: errors.length === 0,
      errors,
      resolver,
    });
  }

  /** Structural + compatibility checks; returns a list of problems (empty = valid) */
  validate(manifest: KubekBlueprintManifest): string[] {
    const errors: string[] = [];
    if (!manifest.id) errors.push("missing id");
    if (!manifest.name) errors.push("missing name");
    if (!SUPPORTED_RUNTIME_KINDS.includes(manifest.runtime?.kind)) {
      errors.push(`unsupported runtime.kind: ${manifest.runtime?.kind}`);
    }
    if (!SUPPORTED_VERSION_KINDS.includes(manifest.versions?.kind)) {
      errors.push(`unsupported versions.kind: ${manifest.versions?.kind}`);
    }
    if (
      manifest.engines?.kubek &&
      !semver.satisfies(KUBEK_VERSION, manifest.engines.kubek)
    ) {
      errors.push(
        `engines.kubek ${manifest.engines.kubek} not satisfied by ${KUBEK_VERSION}`,
      );
    }
    // File icons must be .png
    if (
      manifest.icon &&
      /\.[a-z0-9]+$/i.test(manifest.icon) &&
      !/\.png$/i.test(manifest.icon)
    ) {
      errors.push(`icon must be a .png file (got "${manifest.icon}")`);
    }
    return errors;
  }

  /** Whether a blueprint may run on the current host, per its manifest platforms gate */
  isSupportedHere(manifest: KubekBlueprintManifest): boolean {
    if (!manifest.platforms?.length) return true;
    return manifest.platforms.includes(process.platform as KubekPlatform);
  }

  list(): LoadedBlueprint[] {
    return [...this.blueprints.values()];
  }

  listValid(): LoadedBlueprint[] {
    return this.list().filter((b) => b.valid);
  }

  get(id: string): LoadedBlueprint | undefined {
    return this.blueprints.get(id);
  }

  /**
   * Resolve a blueprint's manifest icon for the UI. A .png file icon is inlined as a data URI so it
   * renders in a plain <img> without an authenticated request; an emoji/text icon is returned as-is.
   * Returns undefined when there is no icon (other file types are rejected by validate())
   */
  iconDataUri(blueprint: LoadedBlueprint): string | undefined {
    const icon = blueprint.manifest.icon;
    if (!icon) return undefined;
    const ext = icon.toLowerCase().split(".").pop() ?? "";
    const mime = ICON_MIME[ext];
    if (!mime) return icon; // emoji or inline text icon
    const file = resolve(blueprint.dir, icon);
    if (file !== blueprint.dir && !file.startsWith(blueprint.dir + sep))
      return undefined;
    if (!existsSync(file)) return undefined;
    const data = readFileSync(file).toString("base64");
    return `data:${mime};base64,${data}`;
  }
}

const ICON_MIME: Record<string, string> = {
  png: "image/png",
};
