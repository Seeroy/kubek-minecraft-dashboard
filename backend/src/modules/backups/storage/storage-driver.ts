export type ProgressFn = (bytes: number) => void;

/**
 * One kind of remote storage. Keys are full object keys, built once with
 * keyFor and stored, so editing the prefix never orphans existing copies
 */
export interface StorageDriver {
  /** Full object key for a path below the configured prefix */
  keyFor(relative: string): string;
  /** Writes and removes a probe object, throws with the provider message */
  test(): Promise<void>;
  upload(
    localPath: string,
    key: string,
    onProgress: ProgressFn,
  ): Promise<number>;
  download(
    key: string,
    localPath: string,
    onProgress: ProgressFn,
  ): Promise<number>;
  remove(key: string): Promise<void>;
  /** Temporary link the browser can download from directly */
  downloadUrl(key: string, fileName: string): string;
}
