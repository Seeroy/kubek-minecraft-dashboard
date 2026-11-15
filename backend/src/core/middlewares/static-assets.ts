import { createHash } from "crypto";
import { lookup } from "mime-types";

export type Encoding = "br" | "gzip";

export interface StaticAsset {
  body: Buffer;
  type: string;
  etag: string;
  encoding: Encoding | undefined;
  // Set when a compressed variant exists, so caches keep one copy per encoding
  vary: boolean;
  cacheControl: string;
}

type CompressedMap = Record<string, { br?: string; gz?: string }>;

const IMMUTABLE = "public, max-age=31536000, immutable";
// Still cached, but checked by ETag so a panel update shows up right away
const REVALIDATE = "no-cache";

/** Next puts a content hash in every _next/static name, so those can be kept forever */
export function cacheControlFor(path: string) {
  return path.startsWith("_next/static/") ? IMMUTABLE : REVALIDATE;
}

/** Best encoding the client accepts among the available ones, br wins over gzip */
export function pickEncoding(header: string | undefined, available: Partial<Record<Encoding, unknown>>): Encoding | undefined {
  if (!header) return undefined;
  const weights = new Map<string, number>();
  for (const part of header.split(",")) {
    const [name, ...params] = part.trim().toLowerCase().split(";");
    const q = params.map((param) => param.trim()).find((param) => param.startsWith("q="));
    weights.set(name.trim(), q ? Number(q.slice(2)) : 1);
  }
  const accepts = (encoding: Encoding) => (weights.get(encoding) ?? weights.get("*") ?? 0) > 0;
  return (["br", "gzip"] as const).find((encoding) => available[encoding] && accepts(encoding));
}

/** Serves the embedded frontend, each file is decoded and hashed once on its first request */
export function createStaticAssets(files: Record<string, string>, compressed: CompressedMap) {
  const cache = new Map<string, { body: Buffer; etag: string }>();

  const load = (path: string, encoding: Encoding | undefined) => {
    const key = `${path}:${encoding ?? "identity"}`;
    let hit = cache.get(key);
    if (!hit) {
      const variants = compressed[path];
      const base64 = encoding === "br" ? variants?.br : encoding === "gzip" ? variants?.gz : files[path];
      const body = Buffer.from(base64 ?? "", "base64");
      // Hash of the bytes actually sent, so each encoding gets its own ETag
      hit = { body, etag: `"${createHash("sha1").update(body).digest("base64url")}"` };
      cache.set(key, hit);
    }
    return hit;
  };

  return {
    get(path: string, acceptEncoding: string | undefined): StaticAsset | undefined {
      if (!Object.hasOwn(files, path)) return undefined;
      const variants = compressed[path];
      const encoding = pickEncoding(acceptEncoding, { br: variants?.br, gzip: variants?.gz });
      return {
        ...load(path, encoding),
        type: lookup(path) || "application/octet-stream",
        encoding,
        vary: !!variants,
        cacheControl: cacheControlFor(path),
      };
    },
  };
}
