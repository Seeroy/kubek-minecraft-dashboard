import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { createHash } from "node:crypto";
import { CatalogService } from "./catalog.service";

const realFetch = globalThis.fetch;
const pkg = Buffer.from("package bytes");
const sha = createHash("sha256").update(pkg).digest("hex");

function item(
  id: string,
  version: string,
  extra: Record<string, unknown> = {},
) {
  return {
    id,
    name: id,
    description: "",
    version,
    author: "someone",
    authorUrl: null,
    engines: { kubek: ">=0.0.0" },
    icon: null,
    iconText: null,
    source: "community",
    repo: "someone/repo",
    homepage: null,
    license: "MIT",
    download: {
      url: `https://github.com/someone/repo/releases/download/v${version}/${id}.kbp`,
      sha256: sha,
      size: pkg.length,
    },
    updatedAt: null,
    ...extra,
  };
}

const index = {
  schemaVersion: 1,
  kind: "blueprint",
  generatedAt: "2026-11-20T00:00:00.000Z",
  items: [
    item("com.a.one", "1.2.0", {
      readme: {
        files: {
          default: "https://kubekpanel.github.io/blueprints/readme/com.a.one.md",
          ru: "https://kubekpanel.github.io/blueprints/readme/com.a.one.ru.md",
        },
        base: "https://github.com/someone/repo/blob/abc/",
      },
    }),
    item("com.a.two", "1.0.0", {
      readme: { files: { default: "https://evil.example/readme.md" }, base: null },
    }),
    item("com.a.bad", "1.0.0"),
  ],
  blocked: [{ id: "com.a.bad", reason: "steals tokens" }],
};

let indexDown = false;
let body = pkg;

beforeEach(() => {
  indexDown = false;
  body = pkg;
  globalThis.fetch = mock(async (input: string | URL | Request) => {
    const url = input instanceof Request ? input.url : input.toString();
    if (url.endsWith("/index.json"))
      return indexDown
        ? new Response("", { status: 503 })
        : Response.json(index);
    if (url.includes("/readme/")) return new Response(`# ${url.split("/").pop()}`);
    return new Response(body);
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("CatalogService", () => {
  test("hides blocked items and marks installed and updatable ones", async () => {
    const res = await new CatalogService().list(
      "blueprints",
      new Map([["com.a.one", { version: "1.0.0" }]]),
    );
    expect(res.items.map((i) => i.id)).toEqual(["com.a.one", "com.a.two"]);
    expect(res.items[0]).toMatchObject({
      installedVersion: "1.0.0",
      updateAvailable: true,
      compatible: true,
    });
    expect(res.items[1]).toMatchObject({
      installedVersion: null,
      updateAvailable: false,
    });
    expect(res.blocked).toEqual(index.blocked);
  });

  test("built-in types never offer an update", async () => {
    const res = await new CatalogService().list(
      "blueprints",
      new Map([["com.a.one", { version: "0.1.0", builtIn: true }]]),
    );
    expect(res.items[0]).toMatchObject({
      builtIn: true,
      updateAvailable: false,
    });
  });

  test("falls back to the last copy when the index is down", async () => {
    const service = new CatalogService();
    await service.list("extensions", new Map());
    indexDown = true;
    const res = await service.list("extensions", new Map(), true);
    expect(res.stale).toBe(true);
    expect(res.items).toHaveLength(2);
  });

  test("fails without any copy", async () => {
    indexDown = true;
    await expect(
      new CatalogService().list("extensions", new Map()),
    ).rejects.toThrow("Catalog is unavailable");
  });

  test("downloads a package that matches the checksum", async () => {
    const res = await new CatalogService().download("blueprints", "com.a.one");
    expect(res.buffer.equals(pkg)).toBe(true);
    expect(res.filename).toBe("com.a.one.kbp");
  });

  test("rejects a swapped package", async () => {
    body = Buffer.from("something else");
    await expect(
      new CatalogService().download("blueprints", "com.a.one"),
    ).rejects.toThrow("Checksum mismatch");
  });

  test("refuses blocked and unknown ids", async () => {
    const service = new CatalogService();
    await expect(service.download("blueprints", "com.a.bad")).rejects.toThrow(
      "is blocked",
    );
    await expect(service.download("blueprints", "com.a.nope")).rejects.toThrow(
      "is not in the catalog",
    );
  });

  test("README in the panel language, README.md otherwise", async () => {
    const service = new CatalogService();
    expect(await service.readme("blueprints", "com.a.one", "ru")).toEqual({
      markdown: "# com.a.one.ru.md",
      lang: "ru",
      base: "https://github.com/someone/repo/blob/abc/",
    });
    expect((await service.readme("blueprints", "com.a.one", "de")).markdown).toBe("# com.a.one.md");
  });

  test("README only from the catalog site", async () => {
    const service = new CatalogService();
    await expect(service.readme("blueprints", "com.a.two")).rejects.toThrow("outside the catalog");
    await expect(service.readme("blueprints", "com.a.nope")).rejects.toThrow("has no README");
  });
});
