import { download, DownloadError, type FetchLike } from "@/core/utils/download";
import { MODRINTH_USER_AGENT } from "@/modules/modrinth/modrinth-client.service";
import type { MrpackFile } from "./mrpack-reader";

export type { FetchLike };

// Declared sizes are sometimes a little off, hashes are what really decides
const SIZE_SLACK = 1024 * 1024;
const FILE_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Download a pack file, hashing it with sha1 and sha512 while it streams to
 * disk. The file only lands at dest when both digests match
 */
export async function downloadVerified(
  file: MrpackFile,
  dest: string,
  onBytes?: (bytes: number) => void,
  fetchImpl: FetchLike = fetch,
): Promise<void> {
  let lastError: unknown;
  for (const url of file.downloads) {
    try {
      await download({
        url,
        dest,
        label: file.path,
        timeout: FILE_TIMEOUT_MS,
        headers: { "User-Agent": MODRINTH_USER_AGENT },
        hashes: { sha1: file.sha1, sha512: file.sha512 },
        maxBytes: file.size + SIZE_SLACK,
        onBytes,
        fetchImpl,
      });
      return;
    } catch (error) {
      lastError =
        error instanceof DownloadError && error.code === "too_large"
          ? new Error(`${file.path} is larger than the pack declares`)
          : error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed to download ${file.path}`);
}
