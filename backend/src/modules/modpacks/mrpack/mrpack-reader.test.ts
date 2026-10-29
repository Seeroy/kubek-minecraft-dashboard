import { describe, expect, test } from "bun:test";
import { ModpackErrorCode } from "@shared/types/modpack.types";
import { MrpackError } from "./mrpack-error";
import { MrpackReader } from "./mrpack-reader";

const SHA1 = "a".repeat(40);
const SHA512 = "b".repeat(128);

function file(overrides: Record<string, unknown> = {}) {
  return {
    path: "mods/lithium.jar",
    hashes: { sha1: SHA1, sha512: SHA512 },
    downloads: ["https://cdn.modrinth.com/data/x/lithium.jar"],
    fileSize: 1024,
    ...overrides,
  };
}

function index(overrides: Record<string, unknown> = {}) {
  return {
    formatVersion: 1,
    game: "minecraft",
    versionId: "1.2.0",
    name: "Test Pack",
    summary: "A pack",
    dependencies: { minecraft: "1.21.1", "fabric-loader": "0.16.5" },
    files: [file()],
    ...overrides,
  };
}

function errorCode(fn: () => unknown): string | undefined {
  try {
    fn();
  } catch (error) {
    if (error instanceof MrpackError) return error.code;
    throw error;
  }
  return undefined;
}

describe("MrpackReader.parseIndex", () => {
  test("reads a fabric pack", () => {
    const manifest = MrpackReader.parseIndex(index());
    expect(manifest).toMatchObject({
      name: "Test Pack",
      versionId: "1.2.0",
      minecraftVersion: "1.21.1",
      loader: "fabric",
      loaderVersion: "0.16.5",
      skippedClientOnly: 0,
      warnings: [{ code: "unknown_env_files", count: 1 }],
    });
    expect(manifest.files[0]).toEqual({
      path: "mods/lithium.jar",
      sha1: SHA1,
      sha512: SHA512,
      size: 1024,
      downloads: ["https://cdn.modrinth.com/data/x/lithium.jar"],
    });
  });

  test.each([
    [{ formatVersion: 2 }],
    [{ game: "terraria" }],
    [{ name: "" }],
    [{ files: "nope" }],
  ])("rejects a broken index %p", (patch) => {
    expect(errorCode(() => MrpackReader.parseIndex(index(patch)))).toBe(
      ModpackErrorCode.INVALID,
    );
  });

  test.each(["quilt-loader", "forge", "neoforge"])(
    "rejects the %s loader",
    (loader) => {
      const deps = { minecraft: "1.21.1", [loader]: "1.0.0" };
      expect(
        errorCode(() => MrpackReader.parseIndex(index({ dependencies: deps }))),
      ).toBe(ModpackErrorCode.LOADER_UNSUPPORTED);
    },
  );

  test("rejects a pack without a loader", () => {
    expect(
      errorCode(() =>
        MrpackReader.parseIndex(
          index({ dependencies: { minecraft: "1.21.1" } }),
        ),
      ),
    ).toBe(ModpackErrorCode.LOADER_UNSUPPORTED);
  });

  test("skips client-only files and warns about optional ones", () => {
    const manifest = MrpackReader.parseIndex(
      index({
        files: [
          file({ env: { client: "required", server: "unsupported" } }),
          file({
            path: "mods/a.jar",
            env: { client: "required", server: "optional" },
          }),
          file({
            path: "mods/b.jar",
            env: { client: "required", server: "required" },
          }),
        ],
      }),
    );
    expect(manifest.files.map((f) => f.path)).toEqual([
      "mods/a.jar",
      "mods/b.jar",
    ]);
    expect(manifest.skippedClientOnly).toBe(1);
    expect(manifest.warnings).toEqual([
      { code: "optional_server_files", count: 1 },
    ]);
  });

  test.each([
    "../escape.jar",
    "mods/../../escape.jar",
    "/etc/passwd",
    "C:/Windows/x.dll",
    "mods\\evil.jar",
  ])("rejects the unsafe path %p", (path) => {
    expect(
      errorCode(() =>
        MrpackReader.parseIndex(index({ files: [file({ path })] })),
      ),
    ).toBe(ModpackErrorCode.UNSAFE_PATH);
  });

  test("rejects files only downloadable from other hosts", () => {
    const files = [
      file({
        downloads: [
          "https://evil.example.com/x.jar",
          "http://cdn.modrinth.com/x.jar",
        ],
      }),
    ];
    expect(errorCode(() => MrpackReader.parseIndex(index({ files })))).toBe(
      ModpackErrorCode.DOWNLOAD_NOT_ALLOWED,
    );
  });

  test("keeps only allowed hosts among several downloads", () => {
    const files = [
      file({
        downloads: [
          "https://evil.example.com/x.jar",
          "https://github.com/o/r/releases/download/v1/x.jar",
        ],
      }),
    ];
    expect(
      MrpackReader.parseIndex(index({ files })).files[0].downloads,
    ).toEqual(["https://github.com/o/r/releases/download/v1/x.jar"]);
  });

  test("requires both hashes", () => {
    const files = [file({ hashes: { sha512: SHA512 } })];
    expect(errorCode(() => MrpackReader.parseIndex(index({ files })))).toBe(
      ModpackErrorCode.INVALID,
    );
  });

  test("rejects versions that are not plain tokens", () => {
    const dependencies = { minecraft: "1.21/../x", "fabric-loader": "0.16.5" };
    expect(
      errorCode(() => MrpackReader.parseIndex(index({ dependencies }))),
    ).toBe(ModpackErrorCode.INVALID);
  });
});
