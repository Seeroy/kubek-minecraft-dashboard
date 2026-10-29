import type { S3StorageConfig } from "@shared/types/backup.types";
import { S3Client } from "bun";
import { posix } from "path";
import type { ProgressFn, StorageDriver } from "./storage-driver";

const PART_SIZE = 16 * 1024 * 1024;
const LINK_TTL_SEC = 10 * 60;

// Bun reports most S3 failures as a generic message with the real cause in code
function describe(err: unknown): Error {
  const { code, message } = (err ?? {}) as { code?: string; message?: string };
  return new Error(
    code
      ? `${code}: ${message ?? "S3 request failed"}`
      : (message ?? String(err)),
  );
}

async function s3<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (err) {
    throw describe(err);
  }
}

export class S3Driver implements StorageDriver {
  private readonly client: S3Client;
  private readonly prefix: string;

  constructor(config: S3StorageConfig) {
    this.client = new S3Client({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      bucket: config.bucket,
      endpoint: config.endpoint || undefined,
      region: config.region || undefined,
      virtualHostedStyle: config.virtualHostedStyle,
    });
    this.prefix = config.prefix.replace(/^\/+|\/+$/g, "");
  }

  test(): Promise<void> {
    const probe = this.client.file(this.keyFor(`.kubek-check-${Date.now()}`));
    return s3(async () => {
      await probe.write("ok");
      await probe.delete();
    });
  }

  upload(localPath: string, key: string, onProgress: ProgressFn) {
    return s3(() => this.put(localPath, key, onProgress));
  }

  download(key: string, localPath: string, onProgress: ProgressFn) {
    return s3(() => this.get(key, localPath, onProgress));
  }

  remove(key: string): Promise<void> {
    return s3(() => this.client.delete(key));
  }

  private async put(
    localPath: string,
    key: string,
    onProgress: ProgressFn,
  ): Promise<number> {
    const writer = this.client.file(key).writer({
      partSize: PART_SIZE,
      queueSize: 4,
      retry: 3,
    });
    let sent = 0;
    let unflushed = 0;
    for await (const chunk of Bun.file(localPath).stream()) {
      writer.write(chunk);
      sent += chunk.length;
      unflushed += chunk.length;
      // Flushing per part keeps memory bounded for multi gigabyte worlds
      if (unflushed >= PART_SIZE) {
        await writer.flush();
        unflushed = 0;
        onProgress(sent);
      }
    }
    await writer.end();
    onProgress(sent);

    const { size } = await this.client.file(key).stat();
    if (size !== sent) throw new Error(`Uploaded ${size} of ${sent} bytes`);
    return size;
  }

  private async get(
    key: string,
    localPath: string,
    onProgress: ProgressFn,
  ): Promise<number> {
    const sink = Bun.file(localPath).writer();
    let received = 0;
    try {
      for await (const chunk of this.client.file(key).stream()) {
        sink.write(chunk);
        received += chunk.length;
        onProgress(received);
      }
    } finally {
      await sink.end();
    }
    return received;
  }

  downloadUrl(key: string, fileName: string): string {
    return this.client.presign(key, {
      expiresIn: LINK_TTL_SEC,
      contentDisposition: `attachment; filename="${fileName}"`,
    });
  }

  keyFor(key: string): string {
    return this.prefix ? posix.join(this.prefix, key) : key;
  }
}
