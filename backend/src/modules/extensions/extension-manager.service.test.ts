import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { pack } from "@/core/utils/archives";
import { ExtensionKvRepository } from "@/modules/database/repositories/extension-kv.repository";
import { ExtensionsRepository } from "@/modules/database/repositories/extensions.repository";
import { PermissionRegistry } from "@/modules/permissions/permission-registry.service";
import { sqliteProvider } from "@/testing/sqlite";
import type { ContextFactory } from "./context/context.factory";
import { ExtensionLoader } from "./extension-loader.service";
import { ExtensionManager } from "./extension-manager.service";
import { ExtensionRegistry } from "./extension-registry.service";
import { ExtensionValidator } from "./extension-validator.service";
import { InProcessHost } from "./isolation/in-process.host";

const seen = globalThis as { __kubekExtTest?: string };

let root: string;
let work: string;
let manager: ExtensionManager;
let registry: ExtensionRegistry;

beforeEach(() => {
  work = fs.mkdtempSync(join(os.tmpdir(), "kubek-ext-mgr-"));
  root = join(work, "extensions");
  const db = sqliteProvider();
  const loader = new ExtensionLoader();
  loader.root = root;
  registry = new ExtensionRegistry();
  manager = new ExtensionManager(
    new ExtensionsRepository(db),
    new ExtensionKvRepository(db),
    new ExtensionValidator(),
    loader,
    registry,
    { build: () => ({}) } as unknown as ContextFactory,
    new InProcessHost(),
    new PermissionRegistry(),
  );
  delete seen.__kubekExtTest;
});

afterEach(() => {
  fs.rmSync(work, { recursive: true, force: true });
});

interface PackageOptions {
  id?: string;
  version: string;
  lib?: string;
  activate?: string;
  frontend?: Record<string, unknown> | false;
}

let packages = 0;
async function makePackage(o: PackageOptions): Promise<Buffer> {
  const src = join(work, `src-${++packages}`);
  fs.mkdirSync(join(src, "backend"), { recursive: true });
  fs.mkdirSync(join(src, "frontend"), { recursive: true });
  fs.writeFileSync(join(src, "backend", "lib.ts"), `export const v = ${JSON.stringify(o.lib ?? o.version)};\n`);
  fs.writeFileSync(
    join(src, "backend", "index.ts"),
    `import { v } from "./lib.ts";\nexport function activate() { ${o.activate ?? ""} (globalThis as any).__kubekExtTest = v; }\n`,
  );
  fs.writeFileSync(join(src, "frontend", "index.ts"), "export default { components: {} };\n");
  const manifest = {
    manifestVersion: 1,
    id: o.id ?? "com.test.ext",
    name: "Test",
    version: o.version,
    engines: { kubek: ">=4.0.0" },
    permissions: {},
    backend: { entry: "backend/index.ts" },
    ...(o.frontend === false ? {} : { frontend: o.frontend ?? { entry: "frontend/index.ts" } }),
  };
  fs.writeFileSync(join(src, "kubek-extension.json"), JSON.stringify(manifest));
  const out = join(work, `pkg-${packages}.zip`);
  await pack([{ path: src, ignoreBase: true }], out);
  return fs.readFileSync(out);
}

const install = async (o: PackageOptions) =>
  manager.installFromBuffer(await makePackage(o), "ext.kubekext");

describe("extension updates", () => {
  it("an update loads the new backend code without a restart", async () => {
    await install({ version: "1.0.0" });
    const enabled = await manager.enable("com.test.ext");
    expect(enabled).toMatchObject({ enabled: true, status: "active" });
    expect(seen.__kubekExtTest).toBe("1.0.0");

    const updated = await install({ version: "2.0.0" });
    expect(updated).toMatchObject({ version: "2.0.0", enabled: true, status: "active" });
    // lib.ts is imported by the entry, it has to be fresh too
    expect(seen.__kubekExtTest).toBe("2.0.0");
  });

  it("a broken update leaves the running version alone", async () => {
    await install({ version: "1.0.0" });
    await manager.enable("com.test.ext");

    await expect(
      install({ version: "2.0.0", frontend: { entry: "frontend/missing.ts" } }),
    ).rejects.toThrow("frontend entry not found");

    expect(registry.isActive("com.test.ext")).toBe(true);
    expect(manager.list()[0]).toMatchObject({ version: "1.0.0", enabled: true, status: "active" });
    expect(fs.readFileSync(join(root, "com.test.ext", "backend", "lib.ts"), "utf8")).toContain("1.0.0");
    // Nothing half built is left next to the live copy
    expect(fs.readdirSync(root)).toEqual(["com.test.ext"]);
  });

  it("the bundle url changes with every build", async () => {
    await install({ version: "1.0.0" });
    await manager.enable("com.test.ext");
    const first = manager.frontendRegistry()[0].bundleUrl;
    expect(first).toStartWith("/api/extensions/com.test.ext/assets/frontend/dist/index.js?v=1.0.0-");
    await Bun.sleep(5);
    await install({ version: "1.0.0" });
    expect(manager.frontendRegistry()[0].bundleUrl).not.toBe(first);
  });
});

describe("enable", () => {
  it("a failing activate is the error status, not a half enabled extension", async () => {
    await install({ version: "1.0.0", activate: 'throw new Error("no token");' });
    const record = await manager.enable("com.test.ext");
    expect(record).toMatchObject({ enabled: false, status: "error", error: "no token" });
    expect(registry.isActive("com.test.ext")).toBe(false);
  });

  it("a declared core permission ends as the error status too", async () => {
    await install({ version: "1.0.0" });
    // Slipped past the validator, e.g. installed by an older panel
    const repo = (manager as unknown as { repo: ExtensionsRepository }).repo;
    const record = repo.findById("com.test.ext")!;
    repo.upsert({
      ...record,
      manifest: {
        ...record.manifest,
        permissions: { declares: [{ key: "file_manager", label: "x" }] },
      },
    });
    const enabled = await manager.enable("com.test.ext");
    expect(enabled).toMatchObject({ enabled: false, status: "error" });
    expect(enabled.error).toContain("core permission");
  });
});

describe("login slots", () => {
  it("lists only login.footer contributions and serves only their bundles", async () => {
    await install({
      id: "com.test.login",
      version: "1.0.0",
      frontend: {
        entry: "frontend/index.ts",
        contributes: {
          slots: [
            { slot: "login.footer", component: "Footer" },
            { slot: "dashboard.header", component: "Header" },
          ],
          sidebar: [{ id: "page", label: "Page", icon: "Box", route: "com.test.login/Page" }],
        },
      },
    });
    await install({ id: "com.test.other", version: "1.0.0" });
    await manager.enable("com.test.login");
    await manager.enable("com.test.other");

    const slots = manager.loginSlots();
    expect(slots).toHaveLength(1);
    expect(slots[0]).toMatchObject({
      id: "com.test.login",
      contributes: { slots: [{ slot: "login.footer", component: "Footer" }] },
    });
    expect(slots[0].bundleUrl).toStartWith("/api/extensions/login-slots/com.test.login/bundle.js?v=");
    expect(manager.loginBundle("com.test.login")).toBe(
      join(root, "com.test.login", "frontend", "dist", "index.js"),
    );
    expect(manager.loginBundle("com.test.other")).toBeNull();

    await manager.disable("com.test.login");
    expect(manager.loginSlots()).toEqual([]);
    expect(manager.loginBundle("com.test.login")).toBeNull();
  });
});

describe("settings", () => {
  it("validates, saves and hides secrets", async () => {
    await install({ version: "1.0.0" });
    const repo = (manager as unknown as { repo: ExtensionsRepository }).repo;
    const record = repo.findById("com.test.ext")!;
    repo.upsert({
      ...record,
      manifest: {
        ...record.manifest,
        settingsSchema: [
          { key: "url", type: "string", label: "Url", rules: "required|url" },
          { key: "token", type: "secret", label: "Token" },
        ],
      },
    });

    let error: any;
    try {
      manager.saveSettings("com.test.ext", { url: "nope" });
    } catch (e) {
      error = e;
    }
    expect(error.getStatus()).toBe(400);
    expect(error.getResponse()).toEqual({
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: [{ field: "url", message: "url" }],
    });

    const saved = manager.saveSettings("com.test.ext", { url: "https://a.b", token: "s3cret" });
    expect(saved.changed).toEqual(["url", "token"]);
    expect(saved.view).toEqual(manager.settings("com.test.ext"));
    expect(saved.view.values).toEqual({ url: "https://a.b" });
    expect(saved.view.secrets).toEqual({ token: true });
    expect(JSON.stringify(saved.view)).not.toContain("s3cret");
  });
});
