import { ApiErrorCode } from "@/core/errors/error-codes";
import { isInside, isRealInside } from "@/core/utils/paths";
import {
  BadRequestException,
  Logger,
  PayloadTooLargeException,
} from "@nestjs/common";
import compressing from "compressing";
import fs, { createReadStream, createWriteStream } from "fs";
import { basename, dirname, join, resolve } from "path";
import { Readable, Transform } from "stream";
import { pipeline } from "stream/promises";

export type ArchiveType = "zip" | "tar" | "tgz";

export function detectArchiveType(archivePath: string): ArchiveType {
  const lower = archivePath.toLowerCase();
  if (lower.endsWith(".tar.gz") || lower.endsWith(".tgz")) return "tgz";
  if (lower.endsWith(".tar")) return "tar";
  return "zip";
}

/** Entry header from compressing, some tar entries have no type */
export interface ArchiveEntryHeader {
  name: string;
  type?: string;
  mode?: number;
  yauzl?: { compressedSize?: number };
}

/** Archive bytes read so far and the archive size */
export type ArchiveProgressFn = (
  doneBytes: number,
  totalBytes: number,
  entryName: string,
) => void;

export type ArchiveEntryHandler = (
  header: ArchiveEntryHeader,
  stream: Readable,
) => Promise<void>;

/** Walk entries one by one, the handler has to read or drain each stream */
export function walkArchive(
  archivePath: string,
  onEntry: ArchiveEntryHandler,
  opts: { type?: ArchiveType; onProgress?: ArchiveProgressFn } = {},
): Promise<void> {
  const type = opts.type ?? detectArchiveType(archivePath);
  return new Promise<void>((resolveWalk, rejectWalk) => {
    let totalBytes = 0;
    let doneBytes = 0;
    let readBytes = 0;
    let failed = false;

    // Tar is read in order, so bytes read are the progress
    let source: string | Readable = archivePath;
    if (type !== "zip") {
      source = createReadStream(archivePath).on("data", (chunk) => {
        readBytes += chunk.length;
      });
    }

    const UncompressStream = (compressing as any)[type].UncompressStream;
    let stream: any;
    const fail = (error: unknown) => {
      if (failed) return;
      failed = true;
      stream?.destroy();
      if (typeof source !== "string") source.destroy();
      rejectWalk(error instanceof Error ? error : new Error(String(error)));
    };

    try {
      totalBytes = fs.statSync(archivePath).size;
      stream = new UncompressStream({ source });
    } catch (error) {
      fail(error);
      return;
    }

    stream.on("error", fail);
    stream.on("finish", () => !failed && resolveWalk());
    stream.on(
      "entry",
      (header: ArchiveEntryHeader, entry: Readable, next: () => void) => {
        if (failed) {
          entry.resume();
          return;
        }
        onEntry(header, entry).then(
          () => {
            doneBytes =
              type === "zip"
                ? doneBytes + (header.yauzl?.compressedSize ?? 0)
                : readBytes;
            opts.onProgress?.(
              Math.min(doneBytes, totalBytes),
              totalBytes,
              header.name,
            );
            next();
          },
          (error: unknown) => {
            entry.resume();
            fail(error);
          },
        );
      },
    );
  });
}

const S_IFMT = 0o170000;
const S_IFREG = 0o100000;

// Zip stores symlinks as files, only the mode tells
function isRegularFile(header: ArchiveEntryHeader): boolean {
  if (header.type && header.type !== "file") return false;
  const kind = (header.mode ?? 0) & S_IFMT;
  return kind === 0 || kind === S_IFREG;
}

function unsafeEntry(): BadRequestException {
  return new BadRequestException("Archive contains entries with unsafe paths");
}

const GiB = 1024 * 1024 * 1024;

export const UNPACK_LIMITS = {
  // Same cap mrpack overrides get
  default: { maxBytes: 8 * GiB, maxEntries: 100_000 },
  // Whole servers, the free space check still applies
  backup: { maxBytes: 256 * GiB, maxEntries: 2_000_000 },
  // Extensions and blueprints
  package: { maxBytes: 1 * GiB, maxEntries: 20_000 },
} as const;

// Leave some room on the disk for the panel and the servers
const FREE_SPACE_RESERVE = 256 * 1024 * 1024;

/** Archive went over its unpack limits, a 413 for API callers */
export class ArchiveTooLargeError extends PayloadTooLargeException {
  constructor(message: string) {
    super({ code: ApiErrorCode.ARCHIVE_TOO_LARGE, message });
  }
}

async function freeBytes(dir: string): Promise<number | null> {
  try {
    const stats = await fs.promises.statfs(dir);
    return Number(stats.bavail) * Number(stats.bsize);
  } catch {
    return null;
  }
}

export interface UnpackOptions {
  deleteAfter?: boolean;
  onProgress?: ArchiveProgressFn;
  /** Uncompressed bytes it may write, counted while writing */
  maxBytes?: number;
  maxEntries?: number;
}

/**
 * Unpack into dest, nothing gets out of it, even through symlinks already there
 * Symlinks and special entries are skipped, throws on any error
 */
export async function unpack(
  archivePath: string,
  unpackPath: string,
  opts: UnpackOptions = {},
): Promise<void> {
  const maxBytes = opts.maxBytes ?? UNPACK_LIMITS.default.maxBytes;
  const maxEntries = opts.maxEntries ?? UNPACK_LIMITS.default.maxEntries;
  const created: string[] = [];
  const track = (made: string | undefined) => made && created.push(made);

  track(await fs.promises.mkdir(unpackPath, { recursive: true }));
  const destRoot = resolve(unpackPath);

  const free = await freeBytes(destRoot);
  const spaceBound = free !== null && free - FREE_SPACE_RESERVE < maxBytes;
  const budget = spaceBound ? Math.max(0, free - FREE_SPACE_RESERVE) : maxBytes;
  const overBudget = () =>
    new ArchiveTooLargeError(
      spaceBound
        ? "Not enough free disk space to unpack the archive"
        : `Archive unpacks to more than ${formatBytes(maxBytes)}`,
    );

  let entries = 0;
  let written = 0;
  try {
    await walkArchive(
      archivePath,
      async (header, entry) => {
        if (++entries > maxEntries) {
          throw new ArchiveTooLargeError(
            `Archive has more than ${maxEntries} entries`,
          );
        }
        const outPath = resolve(join(destRoot, header.name));
        if (!isInside(destRoot, outPath)) throw unsafeEntry();

        if (header.type === "directory") {
          if (!(await isRealInside(destRoot, outPath, true)))
            throw unsafeEntry();
          track(await fs.promises.mkdir(outPath, { recursive: true }));
          entry.resume();
          return;
        }

        // Skip symlinks and other special entries to avoid escapes
        if (!isRegularFile(header)) {
          entry.resume();
          return;
        }

        if (!(await isRealInside(destRoot, outPath, true))) throw unsafeEntry();
        track(await fs.promises.mkdir(dirname(outPath), { recursive: true }));
        const existed = await fs.promises.lstat(outPath).then(
          () => true,
          () => false,
        );
        if (!existed) created.push(outPath);
        // Headers can lie about sizes, so count what really gets written
        const counter = new Transform({
          transform(chunk: Buffer, _enc, cb) {
            written += chunk.length;
            if (written > budget) cb(overBudget());
            else cb(null, chunk);
          },
        });
        await pipeline(entry, counter, createWriteStream(outPath));
        // Keep the exec bit, but never more than 755
        if (process.platform !== "win32" && (header.mode ?? 0) & 0o111) {
          await fs.promises.chmod(outPath, 0o755);
        }
      },
      { onProgress: opts.onProgress },
    );
  } catch (error) {
    if (error instanceof ArchiveTooLargeError) {
      for (const path of created.reverse()) {
        await fs.promises
          .rm(path, { recursive: true, force: true })
          .catch(() => {});
      }
    }
    throw error;
  }

  if (opts.deleteAfter) await fs.promises.unlink(archivePath);
}

function formatBytes(bytes: number): string {
  if (bytes >= GiB) return `${Math.round(bytes / GiB)} GB`;
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

const logger = new Logger("Archives");

/** unpack that returns false instead of throwing */
export const unpackArchive = async (
  archivePath: string,
  unpackPath: string,
  deleteAfterUnpack = false,
  limits: Pick<UnpackOptions, "maxBytes" | "maxEntries"> = {},
): Promise<boolean> => {
  try {
    await unpack(archivePath, unpackPath, {
      ...limits,
      deleteAfter: deleteAfterUnpack,
    });
    return true;
  } catch (e) {
    logger.warn(
      `Failed to unpack ${archivePath}: ${e instanceof Error ? e.message : String(e)}`,
    );
    return false;
  }
};

/** File or folder to add, folders go in whole */
export interface PackSource {
  path: string;
  relativePath?: string;
  /** Put folder contents at the archive root */
  ignoreBase?: boolean;
  /** Plain file that may still be written to, zipped from a live read instead of a size checked one */
  file?: boolean;
}

export interface PackOptions {
  type?: "zip" | "tgz";
  /** Raw size of the sources, used for progress */
  totalBytes?: number;
  onProgress?: (writtenBytes: number, totalBytes: number) => void;
}

// Opens the file only when the zip gets to it, a file gone by then goes in empty
function liveFile(path: string, onBytes: (bytes: number) => void): Readable {
  async function* read() {
    try {
      for await (const chunk of createReadStream(path)) {
        onBytes((chunk as Buffer).length);
        yield chunk as Buffer;
      }
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    }
  }
  return Readable.from(read(), { objectMode: false });
}

/** Stream the sources into one archive */
export async function pack(
  sources: PackSource[],
  outputPath: string,
  opts: PackOptions = {},
): Promise<void> {
  const zip = opts.type !== "tgz";
  const stream = zip
    ? new compressing.zip.Stream()
    : new compressing.tgz.Stream();
  // yazl reports a file that changed size on its ZipFile, which compressing never listens to,
  // the error went uncaught and the archive hung forever
  (stream as unknown as { _zipfile?: NodeJS.EventEmitter })._zipfile?.on(
    "error",
    (err: Error) => stream.destroy(err),
  );

  const totalBytes = Math.max(1, opts.totalBytes ?? 0);
  // Raw bytes read when every source is a live file, archive bytes otherwise
  const byInput = zip && sources.length > 0 && sources.every((s) => s.file);
  let read = 0;
  const onRead = (bytes: number) => {
    read += bytes;
    opts.onProgress?.(read, totalBytes);
  };

  // compressing ends the archive on the first idle tick, so entries go in back to back
  // with no await in between, stats are gathered up front
  const stats = await Promise.all(
    sources.map((source) =>
      zip && source.file
        ? fs.promises.stat(source.path).catch(() => null)
        : null,
    ),
  );
  for (const [i, source] of sources.entries()) {
    if (zip && source.file) {
      const stat = stats[i];
      // compressing types only know fs streams, any readable works
      stream.addEntry(
        liveFile(source.path, onRead) as fs.ReadStream,
        {
          relativePath: source.relativePath ?? basename(source.path),
          mtime: stat?.mtime,
          mode: stat?.mode,
        } as { relativePath: string },
      );
      continue;
    }
    const entryOpts: { relativePath?: string; ignoreBase?: boolean } = {};
    if (source.relativePath !== undefined)
      entryOpts.relativePath = source.relativePath;
    if (source.ignoreBase) entryOpts.ignoreBase = true;
    stream.addEntry(source.path, entryOpts);
  }

  const onProgress = opts.onProgress;
  if (onProgress && !byInput) {
    // Archive bytes against raw bytes is only an estimate, compression makes it lag
    let written = 0;
    stream.on("data", (chunk: Buffer) => {
      written += chunk.length;
      onProgress(written, totalBytes);
    });
  }
  await pipeline(stream, createWriteStream(outputPath));
}
