import { createHash } from "crypto";
import { createWriteStream, promises as fs } from "fs";
import { basename, dirname } from "path";

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export type DownloadHashAlgorithm = "sha1" | "sha256" | "sha512";

// No bytes for this long, the download is stuck
const DEFAULT_IDLE_TIMEOUT_MS = 60_000;

export type DownloadErrorCode = "http" | "integrity" | "too_large" | "timeout";

export class DownloadError extends Error {
  constructor(
    readonly code: DownloadErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "DownloadError";
  }
}

export interface DownloadOptions {
  url: string;
  dest: string;
  /** Limit for the whole download, none by default */
  timeout?: number;
  /** Max wait between chunks, the response included */
  idleTimeout?: number;
  /** Expected hex hashes, the file is kept only if all match */
  hashes?: Partial<Record<DownloadHashAlgorithm, string>>;
  /** Abort when more bytes than this come */
  maxBytes?: number;
  headers?: Record<string, string>;
  /** Percent 0-100, only when the size is known */
  onProgress?: (percent: number) => void;
  /** Byte deltas, a failed try gives its bytes back as a negative one */
  onBytes?: (delta: number) => void;
  signal?: AbortSignal;
  /** Name for error messages, dest file name by default */
  label?: string;
  fetchImpl?: FetchLike;
}

export interface DownloadResult {
  bytes: number;
  /** Hex hash per requested algorithm */
  digests: Partial<Record<DownloadHashAlgorithm, string>>;
}

/** Download into dest.part with hashing on the fly, renamed to dest once all checks pass */
export async function download(
  options: DownloadOptions,
): Promise<DownloadResult> {
  const {
    url,
    dest,
    hashes = {},
    onProgress,
    onBytes,
    fetchImpl = fetch,
  } = options;
  const label = options.label ?? basename(dest);
  const idleTimeout = options.idleTimeout ?? DEFAULT_IDLE_TIMEOUT_MS;

  const controller = new AbortController();
  let timeoutReason: string | null = null;
  const abort = (reason: string) => {
    timeoutReason ??= reason;
    controller.abort();
  };
  const external = options.signal;
  const onExternalAbort = () => controller.abort();
  if (external?.aborted) controller.abort();
  external?.addEventListener("abort", onExternalAbort);

  const totalTimer = options.timeout
    ? setTimeout(() => abort("timed out"), options.timeout)
    : null;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const touch = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => abort("stalled"), idleTimeout);
  };

  const part = `${dest}.part`;
  let reported = 0;
  let out: ReturnType<typeof createWriteStream> | null = null;

  const failIfAborted = () => {
    if (!controller.signal.aborted) return;
    if (timeoutReason) {
      throw new DownloadError(
        "timeout",
        `Download of ${label} ${timeoutReason}`,
      );
    }
    throw new Error(`Download of ${label} was aborted`);
  };

  try {
    touch();
    let res: Response;
    try {
      res = await fetchImpl(url, {
        headers: options.headers,
        signal: controller.signal,
      });
    } catch (error) {
      failIfAborted();
      throw error;
    }
    failIfAborted();
    if (!res.ok || !res.body) {
      throw new DownloadError(
        "http",
        `Download of ${label} failed: HTTP ${res.status}`,
      );
    }

    const total = Number(res.headers.get("content-length") || 0);
    const hashers = (Object.keys(hashes) as DownloadHashAlgorithm[])
      .filter((algorithm) => hashes[algorithm])
      .map((algorithm) => [algorithm, createHash(algorithm)] as const);
    const digests: DownloadResult["digests"] = {};

    await fs.mkdir(dirname(dest), { recursive: true });
    const stream = createWriteStream(part);
    out = stream;
    // Disk errors come out in the loop instead of crashing the process
    const failed: { error: Error | null } = { error: null };
    stream.on("error", (error) => (failed.error = error));
    const reader = res.body.getReader();
    // A read never ends on its own if the source hangs
    const cancel = () => void reader.cancel().catch(() => {});
    controller.signal.addEventListener("abort", cancel);

    let received = 0;
    let lastPercent = -1;
    try {
      for (;;) {
        touch();
        const { done, value } = await reader.read();
        failIfAborted();
        if (done) break;

        received += value.byteLength;
        if (options.maxBytes !== undefined && received > options.maxBytes) {
          throw new DownloadError(
            "too_large",
            `${label} exceeds the expected size`,
          );
        }
        for (const [, hasher] of hashers) hasher.update(value);
        if (!stream.write(value)) {
          await new Promise<void>((resolve, reject) => {
            stream.once("drain", resolve);
            stream.once("error", reject);
          });
        }
        if (failed.error) throw failed.error;
        onBytes?.(value.byteLength);
        reported += value.byteLength;

        if (onProgress && total > 0) {
          const percent = Math.max(
            0,
            Math.min(100, Math.round((received * 100) / total)),
          );
          if (percent !== lastPercent) {
            lastPercent = percent;
            onProgress(percent);
          }
        }
      }
    } finally {
      controller.signal.removeEventListener("abort", cancel);
    }

    await new Promise<void>((resolve, reject) =>
      stream.end((error?: Error | null) => (error ? reject(error) : resolve())),
    );

    for (const [algorithm, hasher] of hashers) {
      const digest = hasher.digest("hex");
      digests[algorithm] = digest;
      if (digest !== hashes[algorithm]!.toLowerCase()) {
        throw new DownloadError(
          "integrity",
          `Integrity check failed for ${label}`,
        );
      }
    }

    await fs.rename(part, dest);
    onProgress?.(100);
    return { bytes: received, digests };
  } catch (error) {
    // .part may still be opening, remove it after close
    if (out && !out.closed) {
      const stream = out;
      await new Promise<void>((resolve) => {
        stream.once("close", () => resolve());
        stream.destroy();
      });
    }
    await fs.rm(part, { force: true });
    // Give the bytes back so progress doesn't jump on a retry
    if (reported) onBytes?.(-reported);
    throw error;
  } finally {
    if (totalTimer) clearTimeout(totalTimer);
    if (idleTimer) clearTimeout(idleTimer);
    external?.removeEventListener("abort", onExternalAbort);
  }
}

/** Throttles progress reports, force always passes */
export function progressThrottle(intervalMs: number) {
  let last = 0;
  return (force = false): boolean => {
    const now = Date.now();
    if (!force && now - last < intervalMs) return false;
    last = now;
    return true;
  };
}
