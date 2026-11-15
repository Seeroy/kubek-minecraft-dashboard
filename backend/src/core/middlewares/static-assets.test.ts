import { describe, expect, test } from "bun:test";
import { brotliCompressSync, gzipSync } from "zlib";
import { cacheControlFor, createStaticAssets, pickEncoding } from "./static-assets";

const b64 = (value: string | Buffer) => Buffer.from(value).toString("base64");

describe("pickEncoding", () => {
  const both = { br: true, gzip: true };

  test("prefers br, falls back to gzip", () => {
    expect(pickEncoding("gzip, deflate, br", both)).toBe("br");
    expect(pickEncoding("gzip, deflate", both)).toBe("gzip");
    expect(pickEncoding("gzip, br", { gzip: true })).toBe("gzip");
  });

  test("respects q=0 and the wildcard", () => {
    expect(pickEncoding("br;q=0, gzip", both)).toBe("gzip");
    expect(pickEncoding("*", both)).toBe("br");
    expect(pickEncoding("*, br;q=0", both)).toBe("gzip");
  });

  test("sends raw bytes when nothing fits", () => {
    expect(pickEncoding(undefined, both)).toBeUndefined();
    expect(pickEncoding("identity", both)).toBeUndefined();
    expect(pickEncoding("br", {})).toBeUndefined();
  });
});

describe("cacheControlFor", () => {
  test("hashed build output is immutable, the rest revalidates", () => {
    expect(cacheControlFor("_next/static/chunks/abc.js")).toBe("public, max-age=31536000, immutable");
    expect(cacheControlFor("index.html")).toBe("no-cache");
    expect(cacheControlFor("plugins/__next._tree.txt")).toBe("no-cache");
    expect(cacheControlFor("favicon.ico")).toBe("no-cache");
  });
});

describe("createStaticAssets", () => {
  const js = "console.log('hello');".repeat(100);
  const assets = createStaticAssets(
    { "_next/static/a.js": b64(js), "favicon.ico": b64("icon") },
    { "_next/static/a.js": { br: b64(brotliCompressSync(js)), gz: b64(gzipSync(js)) } }
  );

  test("serves the encoding the client asks for with its own ETag", () => {
    const br = assets.get("_next/static/a.js", "gzip, br");
    const gz = assets.get("_next/static/a.js", "gzip");
    const raw = assets.get("_next/static/a.js", undefined);
    expect(br?.encoding).toBe("br");
    expect(gz?.encoding).toBe("gzip");
    expect(raw?.encoding).toBeUndefined();
    expect(raw?.body.toString()).toBe(js);
    expect(new Set([br?.etag, gz?.etag, raw?.etag]).size).toBe(3);
    expect(br?.vary).toBe(true);
    expect(br?.type).toBe("text/javascript");
  });

  test("files without variants go out raw and without Vary", () => {
    const icon = assets.get("favicon.ico", "br");
    expect(icon?.encoding).toBeUndefined();
    expect(icon?.vary).toBe(false);
    expect(icon?.body.toString()).toBe("icon");
  });

  test("decodes once and reuses the buffer", () => {
    expect(assets.get("favicon.ico", undefined)?.body).toBe(assets.get("favicon.ico", undefined)!.body);
  });

  test("unknown paths and inherited keys are misses", () => {
    expect(assets.get("missing.js", undefined)).toBeUndefined();
    expect(assets.get("constructor", undefined)).toBeUndefined();
  });
});
