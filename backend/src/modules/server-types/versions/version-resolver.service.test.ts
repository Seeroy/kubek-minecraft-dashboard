import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import type {
  KubekBlueprintManifest,
  VersionSpec,
} from "@kubekpanel/blueprint-sdk";
import fs from "fs";
import os from "os";
import path from "path";
import { fake } from "@/testing/fake";
import { BlueprintResolver } from "../blueprint-resolver.service";
import type { LoadedBlueprint } from "../server-types.types";
import type { HttpEngine } from "./http-engine.service";
import { ResolverRunner } from "./resolver-runner.service";
import { VersionResolverService } from "./version-resolver.service";

let dir: string;
let runner: ResolverRunner;
let service: VersionResolverService;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-versions-"));
  runner = new ResolverRunner();
  service = new VersionResolverService(
    fake<HttpEngine>({
      listVersions: () => Promise.resolve(["2.0", "1.0"]),
    }),
    runner,
    new BlueprintResolver(),
  );
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function blueprint(versions: VersionSpec): LoadedBlueprint {
  const manifest = {
    manifestVersion: 1,
    id: "test.versions",
    name: "Versions",
    game: "test",
    version: "1.0.0",
    runtime: { kind: "native" },
    variables: [],
    versions,
    install: { steps: [] },
    startup: { command: "run", stop: { type: "command", value: "stop" } },
    query: { protocol: "none", port: { value: 0 } },
    ports: [],
  } satisfies KubekBlueprintManifest;
  return { manifest, dir, source: "installed", valid: true, errors: [] };
}

const resolverSource = (label: string) => `
export default {
  listVersions: async () => [{ id: "1.0", label: "${label}" }, { id: "0.9" }],
  resolveDownload: async (v) => ({ url: "https://x/" + v }),
};
`;

describe("VersionResolverService labels", () => {
  test("static entries keep their labels, missing ones are null", async () => {
    const bp = blueprint({
      kind: "static",
      versions: [{ id: "a", label: "Latest" }, { id: "b" }],
    });
    expect(await service.listLabeledVersions(bp)).toEqual([
      { id: "a", label: "Latest" },
      { id: "b", label: null },
    ]);
    expect(await service.listVersions(bp)).toEqual(["a", "b"]);
  });

  test("http lists have no labels", async () => {
    const bp = blueprint({ kind: "http", list: { request: { url: "x" } } });
    expect(await service.listLabeledVersions(bp)).toEqual([
      { id: "2.0", label: null },
      { id: "1.0", label: null },
    ]);
  });

  test("resolver entries carry their labels", async () => {
    fs.writeFileSync(path.join(dir, "versions.ts"), resolverSource("Stable"));
    const bp = blueprint({ kind: "resolver", module: "versions.ts" });
    expect(await service.listLabeledVersions(bp)).toEqual([
      { id: "1.0", label: "Stable" },
      { id: "0.9", label: null },
    ]);
  });

  test("none has no versions", async () => {
    expect(
      await service.listLabeledVersions(blueprint({ kind: "none" })),
    ).toEqual([]);
  });
});

describe("ResolverRunner", () => {
  test("an updated versions.ts is imported again", async () => {
    const file = path.join(dir, "versions.ts");
    fs.writeFileSync(file, resolverSource("old"));
    const first = await runner.load(dir, "versions.ts");
    expect(await runner.load(dir, "versions.ts")).toBe(first);

    fs.writeFileSync(file, resolverSource("new"));
    const second = await runner.load(dir, "versions.ts");
    expect(second).not.toBe(first);
    const ctx = runner.buildContext({});
    expect((await second.listVersions(ctx))[0]?.label).toBe("new");
  });

  test("invalidate drops helpers the resolver imports", async () => {
    fs.writeFileSync(path.join(dir, "label.ts"), `export const label = "a";`);
    fs.writeFileSync(
      path.join(dir, "versions.ts"),
      `import { label } from "./label";
export default {
  listVersions: async () => [{ id: "1", label }],
  resolveDownload: async () => ({ url: "x" }),
};`,
    );
    const ctx = runner.buildContext({});
    const first = await runner.load(dir, "versions.ts");
    expect((await first.listVersions(ctx))[0]?.label).toBe("a");

    fs.writeFileSync(path.join(dir, "label.ts"), `export const label = "b";`);
    runner.invalidate(dir);
    const second = await runner.load(dir, "versions.ts");
    expect((await second.listVersions(ctx))[0]?.label).toBe("b");
  });
});
