import fs, { createWriteStream } from "fs";
import path from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";

/**
 * Download file with progress callback (0-100)
 */
export async function downloadWithProgress(
  url: string,
  destPath: string,
  onProgress?: (p: number) => void,
) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Download failed: ${res.status}`);
  const total = Number(res.headers.get("content-length") || 0);
  let received = 0;

  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  const writer = createWriteStream(destPath);
  const readable = Readable.fromWeb(res.body as any);
  readable.on("data", (chunk: Buffer) => {
    received += chunk.length;
    if (total > 0 && onProgress) {
      const percent = Math.max(
        0,
        Math.min(100, Math.round((received * 100) / total)),
      );
      onProgress(percent);
    }
  });
  await pipeline(readable, writer);
  if (onProgress) onProgress(100);
}
