import { unpackArchive } from "@/core/utils/archives";
import { getErrorMessage } from "@/core/utils/error";
import { safeId } from "@/core/utils/safeId";
import { ExtensionKvRepository } from "@/modules/database/repositories/extension-kv.repository";
import { ExtensionsRepository } from "@/modules/database/repositories/extensions.repository";
import { PermissionRegistry } from "@/modules/permissions/permission-registry.service";
import type {
  Capability,
  KubekExtensionManifest,
} from "@kubekpanel/extension-sdk";
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import fs from "node:fs";
import os from "node:os";
import { join, resolve, sep } from "node:path";
import { ContextFactory, ContextSinks } from "./context/context.factory";
import { ExtensionLoader } from "./extension-loader.service";
import { ExtensionRegistry } from "./extension-registry.service";
import { ExtensionValidator } from "./extension-validator.service";
import type {
  ExtensionRecord,
  KubekBackendModule,
  LoadedExtension,
} from "./extensions.types";
import { InProcessHost } from "./isolation/in-process.host";

const EXT_ROOT = resolve("extensions");
const MANIFEST_FILE = "kubek-extension.json";

const ICON_MIME: Record<string, string> = {
  png: "image/png",
};

/**
 * Owns the extension lifecycle: discover persisted extensions on boot and activate the enabled ones,
 * install/remove packages, and apply consent/enable/disable
 */
@Injectable()
export class ExtensionManager implements OnModuleInit {
  private readonly logger = new Logger(ExtensionManager.name);

  constructor(
    private readonly repo: ExtensionsRepository,
    private readonly kv: ExtensionKvRepository,
    private readonly validator: ExtensionValidator,
    private readonly loader: ExtensionLoader,
    private readonly registry: ExtensionRegistry,
    private readonly contextFactory: ContextFactory,
    private readonly host: InProcessHost,
    private readonly permissions: PermissionRegistry,
  ) {}

  async onModuleInit(): Promise<void> {
    const records = this.repo.findAll();
    for (const record of records) {
      if (record.enabled && record.status !== "error") {
        await this.activate(record).catch((e) =>
          this.logger.error(
            `boot-activate "${record.id}" failed: ${e?.message || e}`,
          ),
        );
      }
    }
    this.logger.log(
      `Loaded ${records.length} extension(s), ${this.registry.list().length} active`,
    );
  }

  list(): Array<ExtensionRecord & { active: boolean; icon?: string }> {
    return this.repo.findAll().map((r) => ({
      ...r,
      active: this.registry.isActive(r.id),
      icon: this.iconDataUri(r.id, r.manifest.icon),
    }));
  }

  /**
   * Inline an extension's manifest icon as a data URI so the management UI can render it in a plain <img>
   */
  private iconDataUri(id: string, icon?: string): string | undefined {
    if (!icon) return undefined;
    const ext = icon.toLowerCase().split(".").pop() ?? "";
    const mime = ICON_MIME[ext];
    if (!mime) return icon; // emoji or inline text icon
    const file = this.resolveAsset(id, icon);
    if (!file) return undefined;
    return `data:${mime};base64,${fs.readFileSync(file).toString("base64")}`;
  }

  /** Active extensions with a frontend half, shaped for the panel runtime to mount */
  frontendRegistry() {
    return this.registry
      .list()
      .map((l) => l.record)
      .filter((r) => r.manifest.frontend)
      .map((r) => ({
        id: r.id,
        name: r.manifest.name,
        version: r.version,
        icon: r.manifest.icon
          ? this.assetUrl(r.id, r.manifest.icon)
          : undefined,
        bundleUrl: this.assetUrl(r.id, "frontend/dist/index.js"),
        contributes: r.manifest.frontend?.contributes ?? {},
        locales: this.readLocales(r.id),
      }));
  }

  /**
   * Bundled locale dictionaries
   */
  private readLocales(id: string): Record<string, Record<string, string>> {
    const dir = this.resolveAsset(id, "locales");
    if (!dir) return {};
    const out: Record<string, Record<string, string>> = {};
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith(".json")) continue;
      try {
        const data = JSON.parse(fs.readFileSync(join(dir, file), "utf8"));
        if (data && typeof data === "object")
          out[file.replace(/\.json$/, "")] = data;
      } catch {
        // ignore a malformed locale file
      }
    }
    return out;
  }

  /** Resolve a static asset path inside an extension dir */
  resolveAsset(id: string, rel: string): string | null {
    const base = this.loader.dir(id);
    const target = resolve(base, rel);
    if (target !== base && !target.startsWith(base + sep)) return null;
    return fs.existsSync(target) ? target : null;
  }

  private assetUrl(id: string, rel: string): string {
    return `/api/extensions/${encodeURIComponent(id)}/assets/${rel}`;
  }

  /** Install from an uploaded .kubekext (zip) or a flat manifest .json */
  async installFromFile(file: Express.Multer.File): Promise<ExtensionRecord> {
    return this.installFromBuffer(
      file.buffer,
      file.originalname || "extension",
    );
  }

  private async installFromBuffer(
    buffer: Buffer,
    filename: string,
  ): Promise<ExtensionRecord> {
    const staged = await this.stage(buffer, filename);
    try {
      const errors = this.validator.validate(staged.manifest);
      if (errors.length)
        throw new BadRequestException(
          `Invalid extension: ${errors.join(", ")}`,
        );

      const dest = join(EXT_ROOT, safeId(staged.manifest.id));
      const existing = this.repo.findById(staged.manifest.id);
      if (existing && this.registry.isActive(existing.id))
        await this.deactivate(existing.id);

      fs.mkdirSync(EXT_ROOT, { recursive: true });
      fs.rmSync(dest, { recursive: true, force: true });
      fs.cpSync(staged.dir, dest, { recursive: true });

      if (staged.manifest.frontend)
        await this.buildFrontend(dest, staged.manifest.frontend.entry);

      return this.repo.upsert({
        id: staged.manifest.id,
        version: staged.manifest.version,
        enabled: false,
        manifest: staged.manifest,
        grantedCapabilities: [],
        status: "installed",
      });
    } finally {
      fs.rmSync(staged.dir, { recursive: true, force: true });
    }
  }

  /** Record which requested capabilities the user approved */
  consent(id: string, capabilities: Capability[]): ExtensionRecord {
    const record = this.require(id);
    const requested = record.manifest.permissions?.requires ?? [];
    const granted = capabilities.filter((c) => requested.includes(c));
    this.repo.setCapabilities(id, granted);
    return this.require(id);
  }

  async enable(id: string): Promise<ExtensionRecord> {
    const record = this.require(id);
    const requested = record.manifest.permissions?.requires ?? [];
    const missing = requested.filter(
      (c) => !record.grantedCapabilities.includes(c),
    );
    if (missing.length) {
      throw new BadRequestException(
        `Consent required for: ${missing.join(", ")}`,
      );
    }
    this.repo.setEnabled(id, true);
    await this.activate(this.require(id));
    return this.require(id);
  }

  async disable(id: string): Promise<ExtensionRecord> {
    this.require(id);
    await this.deactivate(id);
    this.repo.setEnabled(id, false);
    this.repo.setStatus(id, "disabled");
    return this.require(id);
  }

  async remove(id: string): Promise<{ id: string }> {
    this.require(id);
    await this.deactivate(id);
    this.kv.clear(id);
    this.repo.delete(id);
    fs.rmSync(join(EXT_ROOT, safeId(id)), { recursive: true, force: true });
    return { id };
  }

  /** Load the backend, build a gated context, run activate() */
  private async activate(record: ExtensionRecord): Promise<void> {
    if (this.registry.isActive(record.id)) return;
    if (record.manifest.permissions?.declares?.length) {
      this.permissions.register(
        record.id,
        record.manifest.permissions.declares,
      );
    }
    if (!record.manifest.backend) {
      // frontend-only extension: nothing to run on the backend, but track it as active so the
      // frontend registry/dispatch see it
      const noop: KubekBackendModule = { activate: () => {} };
      this.registry.add({
        record,
        module: noop,
        ctx: this.contextFactory.build(record, this.makeSinks([])),
        dispose: [],
      });
      this.repo.setStatus(record.id, "active");
      return;
    }

    const dispose: Array<() => void> = [];
    const ctx = this.contextFactory.build(record, this.makeSinks(dispose));
    const module = await this.loader.load(
      record.id,
      record.manifest.backend.entry,
    );
    const loaded: LoadedExtension = { record, module, ctx, dispose };

    const error = await this.host.activate(module, ctx);
    if (error) {
      dispose.forEach((fn) => fn());
      this.permissions.unregister(record.id);
      this.repo.setStatus(record.id, "error");
      this.repo.upsert({ ...record, status: "error", error });
      return;
    }
    this.registry.add(loaded);
    this.repo.setStatus(record.id, "active");
  }

  /** Run deactivate(), unwind subscriptions, drop permissions and contributions */
  private async deactivate(id: string): Promise<void> {
    const loaded = this.registry.get(id);
    if (loaded) {
      await this.host.deactivate(loaded.module, id);
      loaded.dispose.forEach((fn) => fn());
    }
    this.permissions.unregister(id);
    this.registry.remove(id);
  }

  /**
   * Build the frontend half to an ESM bundle (frontend/dist/index.js). Host packages stay
   * external; the bundle reads React/UI/api from window.Kubek at runtime
   */
  private async buildFrontend(dest: string, entry: string): Promise<void> {
    const entrypoint = join(dest, entry);
    if (!fs.existsSync(entrypoint))
      throw new BadRequestException(`frontend entry not found: ${entry}`);
    const result = await Bun.build({
      entrypoints: [entrypoint],
      outdir: join(dest, "frontend", "dist"),
      format: "esm",
      target: "browser",
      external: ["react", "react-dom", "@kubekpanel/extension-sdk"],
      naming: "[dir]/index.[ext]",
    });
    if (!result.success) {
      throw new BadRequestException(
        `frontend build failed: ${result.logs.map((l) => l.message).join("; ")}`,
      );
    }
  }

  /** Wire the context sinks to the in-memory registry for the given teardown list */
  private makeSinks(dispose: Array<() => void>): ContextSinks {
    return {
      dispose,
      registerRoutes: (extId, routes) => this.registry.setRoutes(extId, routes),
      registerCommand: (extId, cmd) => this.registry.addCommand(extId, cmd),
    };
  }

  private require(id: string): ExtensionRecord {
    const record = this.repo.findById(id);
    if (!record) throw new NotFoundException(`Unknown extension: ${id}`);
    return record;
  }

  /** Unpack a package (or flat manifest) into a temp dir and read its manifest */
  private async stage(
    buffer: Buffer,
    filename: string,
  ): Promise<{ manifest: KubekExtensionManifest; dir: string }> {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".json")) {
      const manifest = this.parseManifest(buffer);
      const dir = fs.mkdtempSync(join(os.tmpdir(), "kubek-ext-"));
      fs.writeFileSync(
        join(dir, MANIFEST_FILE),
        JSON.stringify(manifest, null, 2),
      );
      return { manifest, dir };
    }

    const work = fs.mkdtempSync(join(os.tmpdir(), "kubek-ext-"));
    const archivePath = join(work, "upload.zip");
    fs.writeFileSync(archivePath, buffer);
    const extractDir = join(work, "extracted");
    const ok = await unpackArchive(archivePath, extractDir, true);
    if (!ok) {
      fs.rmSync(work, { recursive: true, force: true });
      throw new BadRequestException("Failed to unpack extension archive");
    }
    const root = this.findManifestRoot(extractDir);
    if (!root) {
      fs.rmSync(work, { recursive: true, force: true });
      throw new BadRequestException(`Archive has no ${MANIFEST_FILE}`);
    }
    const manifest = this.parseManifest(
      fs.readFileSync(join(root, MANIFEST_FILE)),
    );
    return { manifest, dir: root };
  }

  private findManifestRoot(dir: string): string | null {
    if (fs.existsSync(join(dir, MANIFEST_FILE))) return dir;
    for (const entry of fs.readdirSync(dir)) {
      const sub = join(dir, entry);
      if (
        fs.statSync(sub).isDirectory() &&
        fs.existsSync(join(sub, MANIFEST_FILE))
      )
        return sub;
    }
    return null;
  }

  private parseManifest(buffer: Buffer): KubekExtensionManifest {
    try {
      const manifest = JSON.parse(buffer.toString("utf-8"));
      if (!manifest?.id) throw new Error("missing id");
      return manifest;
    } catch (e: unknown) {
      throw new BadRequestException(
        `Invalid extension manifest: ${getErrorMessage(e)}`,
      );
    }
  }
}
