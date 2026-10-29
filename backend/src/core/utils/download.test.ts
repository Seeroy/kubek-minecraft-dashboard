import { afterAll, describe, expect, test } from "bun:test";
import { createHash } from "crypto";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import {
  download,
  DownloadError,
  type FetchLike,
  progressThrottle,
} from "./download";

const dir = mkdtempSync(join(tmpdir(), "kubek-download-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const body = Buffer.from("server jar bytes ".repeat(4096));
const digest = (algorithm: string) =>
  createHash(algorithm).update(body).digest("hex");

const serve =
  (make: () => Response): FetchLike =>
  () =>
    Promise.resolve(make());

const failure = (promise: Promise<unknown>) =>
  promise.then(
    () => null,
    (error: unknown) => error as Error,
  );

// Sends one chunk and then hangs
function hangingBody(): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new Uint8Array(16));
    },
  });
}

describe("download", () => {
  test("writes the file and reports digests and progress", async () => {
    const dest = join(dir, "ok", "server.jar");
    const progress: number[] = [];
    const result = await download({
      url: "https://example.com/server.jar",
      dest,
      hashes: { sha1: digest("sha1"), sha256: digest("sha256").toUpperCase() },
      onProgress: (p) => progress.push(p),
      fetchImpl: serve(
        () =>
          new Response(body, {
            headers: { "content-length": String(body.length) },
          }),
      ),
    });
    expect(readFileSync(dest).equals(body)).toBe(true);
    expect(existsSync(`${dest}.part`)).toBe(false);
    expect(result.bytes).toBe(body.length);
    expect(result.digests.sha1).toBe(digest("sha1"));
    expect(progress.at(-1)).toBe(100);
  });

  test("hash mismatch leaves neither dest nor part behind", async () => {
    const dest = join(dir, "bad", "a.jar");
    let bytes = 0;
    const error = await failure(
      download({
        url: "https://example.com/a.jar",
        dest,
        hashes: { sha512: "0".repeat(128) },
        onBytes: (n) => (bytes += n),
        fetchImpl: serve(() => new Response(body)),
      }),
    );
    expect(error).toBeInstanceOf(DownloadError);
    expect((error as DownloadError).code).toBe("integrity");
    expect(existsSync(dest)).toBe(false);
    expect(existsSync(`${dest}.part`)).toBe(false);
    expect(bytes).toBe(0);
  });

  test("http errors carry the status", async () => {
    const error = await failure(
      download({
        url: "https://example.com/missing",
        dest: join(dir, "missing", "a.jar"),
        fetchImpl: serve(() => new Response(null, { status: 404 })),
      }),
    );
    expect((error as DownloadError).code).toBe("http");
    expect(error?.message).toContain("HTTP 404");
  });

  test("maxBytes aborts and cleans the part file", async () => {
    const dest = join(dir, "big", "a.jar");
    const error = await failure(
      download({
        url: "https://example.com/a.jar",
        dest,
        maxBytes: 10,
        fetchImpl: serve(() => new Response(body)),
      }),
    );
    expect((error as DownloadError).code).toBe("too_large");
    expect(existsSync(`${dest}.part`)).toBe(false);
  });

  test("a stalled body times out and cleans the part file", async () => {
    const dest = join(dir, "stall", "a.jar");
    const error = await failure(
      download({
        url: "https://example.com/a.jar",
        dest,
        idleTimeout: 50,
        fetchImpl: serve(() => new Response(hangingBody())),
      }),
    );
    expect((error as DownloadError).code).toBe("timeout");
    expect(existsSync(dest)).toBe(false);
    expect(existsSync(`${dest}.part`)).toBe(false);
  });

  test("the total timeout fires even while bytes keep coming", async () => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const trickle = new ReadableStream<Uint8Array>({
      start(controller) {
        timer = setInterval(() => controller.enqueue(new Uint8Array(1)), 10);
      },
      cancel() {
        clearInterval(timer);
      },
    });
    const error = await failure(
      download({
        url: "https://example.com/a.jar",
        dest: join(dir, "slow", "a.jar"),
        timeout: 80,
        fetchImpl: serve(() => new Response(trickle)),
      }),
    );
    clearInterval(timer);
    expect((error as DownloadError).code).toBe("timeout");
  });

  test("an external signal aborts the transfer", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 30);
    const error = await failure(
      download({
        url: "https://example.com/a.jar",
        dest: join(dir, "abort", "a.jar"),
        signal: controller.signal,
        fetchImpl: serve(() => new Response(hangingBody())),
      }),
    );
    expect(error?.message).toContain("aborted");
  });
});

describe("progressThrottle", () => {
  test("lets one call through per interval unless forced", () => {
    const ready = progressThrottle(10_000);
    expect(ready()).toBe(true);
    expect(ready()).toBe(false);
    expect(ready(true)).toBe(true);
  });
});
