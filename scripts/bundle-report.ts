import { readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { gzipSync } from "zlib";

// Initial asset weight per exported page, run after `next build` in frontend
const outDir = path.resolve(__dirname, "..", "frontend", "out");
const pages = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["index", "login", "console", "files", "panel-settings"];

const sizeCache = new Map<string, { raw: number; gz: number }>();

function assetSize(src: string) {
  const cached = sizeCache.get(src);
  if (cached) return cached;
  const buf = readFileSync(path.join(outDir, src));
  const size = { raw: buf.length, gz: gzipSync(buf).length };
  sizeCache.set(src, size);
  return size;
}

function sum(srcs: string[]) {
  return srcs.reduce(
    (acc, src) => {
      const s = assetSize(src);
      return { raw: acc.raw + s.raw, gz: acc.gz + s.gz };
    },
    { raw: 0, gz: 0 },
  );
}

function dirSize(dir: string): number {
  return readdirSync(dir).reduce((total, name) => {
    const full = path.join(dir, name);
    const st = statSync(full);
    return total + (st.isDirectory() ? dirSize(full) : st.size);
  }, 0);
}

const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;

const rows = pages.map((page) => {
  const html = readFileSync(path.join(outDir, `${page}.html`), "utf8");
  const js = [...new Set([...html.matchAll(/<script[^>]+src="\/([^"]+\.js)"/g)].map((m) => m[1]))];
  const css = [...new Set([...html.matchAll(/<link[^>]+href="\/([^"]+\.css)"/g)].map((m) => m[1]))];
  const jsSize = sum(js);
  const cssSize = sum(css);
  return {
    page,
    chunks: js.length,
    js: kb(jsSize.raw),
    "js gz": kb(jsSize.gz),
    css: kb(cssSize.raw),
    "css gz": kb(cssSize.gz),
  };
});

console.table(rows);
console.log(`out/ total: ${kb(dirSize(outDir))}`);
