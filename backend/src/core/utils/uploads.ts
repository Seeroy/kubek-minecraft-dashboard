import { Logger } from "@nestjs/common";
import {
  copyFileSync,
  mkdirSync,
  promises as fs,
  renameSync,
  rmSync,
  writeFileSync,
} from "fs";
import { diskStorage, type StorageEngine } from "multer";
import { tmpdir } from "os";
import { join } from "path";

const MiB = 1024 * 1024;
const GiB = 1024 * MiB;

/** Max multipart file size per upload route */
export const UPLOAD_LIMITS = {
  file: 4 * GiB,
  serverImport: 2 * GiB,
  core: 512 * MiB,
  icon: 2 * MiB,
} as const;

export const UPLOAD_TMP_DIR = join(tmpdir(), "kubek-uploads");

// Anything this old was left by a crash or a failed background task
const STALE_UPLOAD_MS = 24 * 60 * 60 * 1000;

const logger = new Logger("Uploads");
let lastSweep = 0;

async function sweepStaleUploads(): Promise<void> {
  const now = Date.now();
  for (const name of await fs.readdir(UPLOAD_TMP_DIR).catch(() => [])) {
    const path = join(UPLOAD_TMP_DIR, name);
    const stat = await fs.stat(path).catch(() => null);
    if (stat && now - stat.mtimeMs > STALE_UPLOAD_MS) {
      await fs.rm(path, { force: true }).catch(() => {});
    }
  }
}

/** Multer storage that streams uploads into a temp file instead of RAM */
export function uploadStorage(): StorageEngine {
  return diskStorage({
    destination: (_req, _file, cb) => {
      try {
        mkdirSync(UPLOAD_TMP_DIR, { recursive: true });
        if (Date.now() - lastSweep > STALE_UPLOAD_MS / 4) {
          lastSweep = Date.now();
          sweepStaleUploads().catch((error) =>
            logger.warn(`Failed to sweep old uploads: ${String(error)}`),
          );
        }
        cb(null, UPLOAD_TMP_DIR);
      } catch (error) {
        cb(error as Error, UPLOAD_TMP_DIR);
      }
    },
  });
}

/** Drop the temp file of an upload, fine if it's already gone */
export async function removeUpload(
  file: Pick<Express.Multer.File, "path"> | undefined,
): Promise<void> {
  if (file?.path) await fs.rm(file.path, { force: true }).catch(() => {});
}

type UploadedFile = Pick<Express.Multer.File, "path" | "buffer">;

/** Moves the upload to its final path, from a temp file or a buffer */
export async function placeUpload(
  file: UploadedFile,
  to: string,
): Promise<void> {
  if (!file.path) {
    await fs.writeFile(to, file.buffer);
    return;
  }
  try {
    await fs.rename(file.path, to);
  } catch (error) {
    // The temp dir can be on another disk
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
    try {
      await fs.copyFile(file.path, to);
    } catch (copyError) {
      await fs.rm(to, { force: true }).catch(() => {});
      throw copyError;
    }
    await fs.rm(file.path, { force: true });
  }
}

export function placeUploadSync(file: UploadedFile, to: string): void {
  if (!file.path) {
    writeFileSync(to, file.buffer);
    return;
  }
  try {
    renameSync(file.path, to);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EXDEV") throw error;
    try {
      copyFileSync(file.path, to);
    } catch (copyError) {
      rmSync(to, { force: true });
      throw copyError;
    }
    rmSync(file.path, { force: true });
  }
}

export function removeUploadSync(
  file: Pick<Express.Multer.File, "path">,
): void {
  if (file.path) rmSync(file.path, { force: true });
}
