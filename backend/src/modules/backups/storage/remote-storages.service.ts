import { AppEventsService } from "@/core/events/app-events.service";
import { getErrorMessage } from "@/core/utils/error";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { S3StorageConfig } from "@shared/types/backup.types";
import {
  BackupStoragesRepository,
  type StoredStorage,
} from "../repositories/backup-storages.repository";
import { S3Driver } from "./s3.driver";
import type { ProgressFn, StorageDriver } from "./storage-driver";

/** Hands out drivers for configured storages, rebuilt when a config changes */
@Injectable()
export class RemoteStorages {
  private readonly drivers = new Map<
    string,
    { version: number; driver: StorageDriver }
  >();

  constructor(
    private readonly repo: BackupStoragesRepository,
    private readonly events: AppEventsService,
  ) {}

  upload(
    storageId: string,
    localPath: string,
    key: string,
    onProgress: ProgressFn,
  ) {
    return this.call(storageId, (d) => d.upload(localPath, key, onProgress));
  }

  download(
    storageId: string,
    key: string,
    localPath: string,
    onProgress: ProgressFn,
  ) {
    return this.call(storageId, (d) => d.download(key, localPath, onProgress));
  }

  keyFor(storageId: string, relative: string): string {
    return this.driver(storageId).keyFor(relative);
  }

  exists(storageId: string): boolean {
    return !!this.repo.findById(storageId);
  }

  remove(storageId: string, key: string): Promise<void> {
    return this.call(storageId, (d) => d.remove(key));
  }

  downloadUrl(storageId: string, key: string, fileName: string): string {
    return this.driver(storageId).downloadUrl(key, fileName);
  }

  test(config: S3StorageConfig): Promise<void> {
    return createDriver(config).test();
  }

  // Driver failures mean the storage itself is in trouble, not the backup
  private async call<T>(
    storageId: string,
    work: (driver: StorageDriver) => Promise<T>,
  ): Promise<T> {
    const driver = this.driver(storageId);
    try {
      return await work(driver);
    } catch (err) {
      this.events.emit("storage.unreachable", {
        storageId,
        storageName: this.repo.findById(storageId)?.name ?? storageId,
        error: getErrorMessage(err),
      });
      throw err;
    }
  }

  private driver(storageId: string): StorageDriver {
    const storage = this.repo.findById(storageId);
    if (!storage) throw new NotFoundException("Storage not found");
    const cached = this.drivers.get(storageId);
    if (cached?.version === storage.updatedAt) return cached.driver;
    const driver = createDriver(storage.config);
    this.drivers.set(storageId, { version: storage.updatedAt, driver });
    return driver;
  }
}

function createDriver(config: StoredStorage["config"]): StorageDriver {
  return new S3Driver(config);
}
