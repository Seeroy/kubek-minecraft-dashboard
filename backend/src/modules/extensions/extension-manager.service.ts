import { ApiErrorCode } from "@/core/errors/error-codes";
import { UNPACK_LIMITS, unpackArchive } from "@/core/utils/archives";
import { getErrorMessage } from "@/core/utils/error";
import { isInside } from "@/core/utils/paths";
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
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";
import fs from "node:fs";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { join, resolve } from "node:path";
import { ContextFactory, ContextSinks } from "./context/context.factory";
import { ExtensionLoader } from "./extension-loader.service";
import { ExtensionRegistry } from "./extension-registry.service";
import {
  applySettings,
  CONFIG_KEY,
  type SettingsView,
  viewSettings,
} from "./extension-settings";
import { ExtensionValidator } from "./extension-validator.service";
import type {
  ExtensionRecord,
  KubekBackendModule,
} from "./extensions.types";
import { InProcessHost } from "./isolation/in-process.host";

const MANIFEST_FILE = "kubek-extension.json";
const BUNDLE = "frontend/dist/index.js";
const LOGIN_SLOT = "login.footer";

const ICON_MIME: Record<string, string> = {
  png: "image/png",
};

/**
 * Owns the extension lifecycle: discover persisted extensions on boot and activate the enabled ones,
 * install/remove packages, and apply consent/enable/disable
 */
@Injectable()
export class ExtensionManager
  implements OnModuleInit, OnApplicationShutdown
{
  private readonly logger = new Logger(ExtensionManager.name);
  // The table has no error column, the last activation error lives here
  private readonly errors = new Map<string, string>();
  // Set per install so an update imports its new backend code
  private readonly importTokens = new Map<string, string>();

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
        await this.activate(record);
      }
    }
    this.logger.log(
      `Loaded ${records.length} extension(s), ${this.registry.list().length} active`,
    );
  }

  list(): Array<ExtensionRecord & { active: boolean; icon?: string }> {
    return this.repo.findAll().map((r) => ({
      ...this.withError(r),
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
    return this.frontendRecords().map((r) => ({
      id: r.id,
      name: r.manifest.name,
      version: r.version,
      icon: r.manifest.icon ? this.assetUrl(r.id, r.manifest.icon) : undefined,
      bundleUrl: `${this.assetUrl(r.id, BUNDLE)}?v=${this.bundleVersion(r)}`,
      contributes: r.manifest.frontend?.contributes ?? {},
      locales: this.readLocales(r.id),
    }));
  }

  /** Extensions with a login.footer slot, served before login so only that slot and bundle */
  loginSlots() {
    return this.frontendRecords()
      .filter((r) => this.hasLoginSlot(r))
      .map((r) => ({
        id: r.id,
        name: r.manifest.name,
        version: r.version,
        bundleUrl: `/api/extensions/login-slots/${encodeURIComponent(r.id)}/bundle.js?v=${this.bundleVersion(r)}`,
        contributes: {
          slots: (r.manifest.frontend?.contributes?.slots ?? []).filter(
            (s) => s.slot === LOGIN_SLOT,
          ),
        },
        locales: this.readLocales(r.id),
      }));
  }

  /** Bundle file of an active login.footer extension, null for anything else */
  loginBundle(id: string): string | null {
    const record = this.registry.get(id)?.record;
    if (!record || !this.hasLoginSlot(record)) return null;
    return this.resolveAsset(id, BUNDLE);
  }

  private frontendRecords(): ExtensionRecord[] {
    return this.registry
      .list()
      .map((l) => l.record)
      .filter((r) => r.manifest.frontend);
  }

  private hasLoginSlot(record: ExtensionRecord): boolean {
    return (record.manifest.frontend?.contributes?.slots ?? []).some(
      (s) => s.slot === LOGIN_SLOT,
    );
  }

  // Changes with every build, so the browser and the runtime cache miss after an update
  private bundleVersion(record: ExtensionRecord): string {
    const file = this.resolveAsset(record.id, BUNDLE);
    const built = file ? Math.round(fs.statSync(file).mtimeMs) : 0;
    return encodeURIComponent(`${record.version}-${built}`);
  }

  /** Settings form data, secret values never leave the backend */
  settings(id: string): SettingsView {
    const record = this.require(id);
    return viewSettings(record.manifest.settingsSchema, this.readConfig(id));
  }

  saveSettings(
    id: string,
    values: unknown,
  ): { view: SettingsView; changed: string[] } {
    const record = this.require(id);
    if (!values || typeof values !== "object" || Array.isArray(values))
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "Validation failed",
        details: [{ field: "values", message: "type" }],
      });
    const schema = record.manifest.settingsSchema;
    const { next, changed, errors } = applySettings(
      schema,
      this.readConfig(id),
      values as Record<string, unknown>,
    );
    if (errors.length)
      throw new BadRequestException({
        code: ApiErrorCode.VALIDATION_ERROR,
        message: "Validation failed",
        details: errors,
      });
    if (changed.length) this.kv.set(id, CONFIG_KEY, next);
    return { view: viewSettings(schema, next), changed };
  }

  private readConfig(id: string): Record<string, unknown> {
    return this.kv.get<Record<string, unknown>>(id, CONFIG_KEY) ?? {};
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
    if (!isInside(base, target)) return null;
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

  /** expectedId guards catalog installs, an update is built aside and swapped in only when that worked */
  async installFromBuffer(
    buffer: Buffer,
    filename: string,
    expectedId?: string,
  ): Promise<ExtensionRecord> {
    const staged = await this.stage(buffer, filename);
    let build: string | null = null;
    try {
      const errors = this.validator.validate(staged.manifest);
      if (errors.length)
        throw new BadRequestException(
          `Invalid extension: ${errors.join(", ")}`,
        );
      if (expectedId && staged.manifest.id !== expectedId)
        throw new BadRequestException(
          `Package id ${staged.manifest.id} does not match ${expectedId}`,
        );

      const id = staged.manifest.id;
      // Next to the live copy, so the swap is a rename on the same disk
      fs.mkdirSync(this.loader.root, { recursive: true });
      build = join(this.loader.root, `.staging-${safeId(id)}-${randomUUID()}`);
      fs.cpSync(staged.dir, build, { recursive: true });
      if (staged.manifest.frontend)
        await this.buildFrontend(build, staged.manifest.frontend.entry);

      const existing = this.repo.findById(id);
      const wasActive = !!existing && this.registry.isActive(id);
      if (wasActive) await this.deactivate(id);
      try {
        this.swap(build, this.loader.dir(id));
        build = null;
      } catch (e) {
        if (wasActive && existing) await this.activate(existing);
        throw e;
      }
      this.loader.forget(id);
      this.importTokens.set(id, `${staged.manifest.version}-${Date.now()}`);
      this.errors.delete(id);

      // An update keeps what was already approved, new permissions still need consent
      const requested = staged.manifest.permissions?.requires ?? [];
      const granted = (existing?.grantedCapabilities ?? []).filter((c) =>
        requested.includes(c),
      );
      this.repo.upsert({
        id,
        enabled: false,
        manifest: staged.manifest,
        grantedCapabilities: granted,
        status: "installed",
      });
      // A failed start shows up as the error status, the install itself went fine
      if (existing?.enabled && granted.length === requested.length)
        return this.enable(id).catch(() => this.require(id));
      return this.require(id);
    } finally {
      fs.rmSync(staged.dir, { recursive: true, force: true });
      if (build) fs.rmSync(build, { recursive: true, force: true });
    }
  }

  /** Put the built copy in place, the old one comes back if that fails */
  private swap(build: string, dest: string): void {
    const old = fs.existsSync(dest)
      ? join(this.loader.root, `.old-${randomUUID()}`)
      : null;
    if (old) fs.renameSync(dest, old);
    try {
      fs.renameSync(build, dest);
    } catch (e) {
      if (old) fs.renameSync(old, dest);
      throw e;
    }
    if (old) fs.rmSync(old, { recursive: true, force: true });
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
    // Enabled only once it really started, a failure is the error status, not a 500
    const error = await this.activate(record);
    this.repo.setEnabled(id, !error);
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
    this.loader.forget(id);
    this.errors.delete(id);
    this.importTokens.delete(id);
    fs.rmSync(this.loader.dir(id), { recursive: true, force: true });
    return { id };
  }

  /** Load the backend, build a gated context, run activate(). Returns the error, never throws */
  private async activate(record: ExtensionRecord): Promise<string | null> {
    if (this.registry.isActive(record.id)) return null;
    const dispose: Array<() => void> = [];
    try {
      if (record.manifest.permissions?.declares?.length) {
        this.permissions.register(
          record.id,
          record.manifest.permissions.declares,
        );
      }
      const ctx = this.contextFactory.build(record, this.makeSinks(dispose));
      // A frontend-only extension still counts as active for the registry and dispatch
      let module: KubekBackendModule = { activate: () => {} };
      if (record.manifest.backend) {
        module = await this.loader.load(
          record.id,
          record.manifest.backend.entry,
          this.importTokens.get(record.id) ?? record.version,
        );
        const error = await this.host.activate(module, ctx);
        if (error) throw new Error(error);
      }
      this.registry.add({ record, module, ctx, dispose });
      this.errors.delete(record.id);
      this.repo.setStatus(record.id, "active");
      return null;
    } catch (e: unknown) {
      const message = getErrorMessage(e);
      this.logger.error(`activate "${record.id}" failed: ${message}`);
      runAll(dispose);
      this.permissions.unregister(record.id);
      // Drops routes and commands the failed activate() managed to register
      this.registry.remove(record.id);
      this.errors.set(record.id, message);
      this.repo.setStatus(record.id, "error");
      return message;
    }
  }

  /** Child processes of extensions must not outlive the panel */
  async onApplicationShutdown(): Promise<void> {
    for (const loaded of this.registry.list()) {
      await this.host.deactivate(loaded.module, loaded.record.id);
      runAll(loaded.dispose);
    }
  }

  /** Run deactivate(), unwind subscriptions, drop permissions and contributions */
  private async deactivate(id: string): Promise<void> {
    const loaded = this.registry.get(id);
    if (loaded) {
      await this.host.deactivate(loaded.module, id);
      runAll(loaded.dispose);
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
    return this.withError(record);
  }

  private withError(record: ExtensionRecord): ExtensionRecord {
    const error = this.errors.get(record.id);
    return error && record.status === "error" ? { ...record, error } : record;
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
    const ok = await unpackArchive(
      archivePath,
      extractDir,
      true,
      UNPACK_LIMITS.package,
    );
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

// One failing teardown must not keep the rest from running
function runAll(fns: Array<() => void>): void {
  for (const fn of fns) {
    try {
      fn();
    } catch {
      // the extension is going away anyway
    }
  }
}
