import { secretHint, resolveSecret } from "@/core/utils/secrets";
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  BackupStorage,
  S3StorageConfig,
} from "@shared/types/backup.types";
import { BackupCopiesRepository } from "../repositories/backup-copies.repository";
import {
  BackupStoragesRepository,
  type StoredStorage,
} from "../repositories/backup-storages.repository";
import { BackupPolicyService } from "../policy/backup-policy.service";
import { RemoteStorages } from "./remote-storages.service";

const LOCATION_FIELDS = ["endpoint", "bucket", "prefix"] as const;

export interface StorageInput {
  name: string;
  config: Omit<S3StorageConfig, "secretAccessKey"> & {
    secretAccessKey?: string;
  };
}

@Injectable()
export class BackupStoragesService {
  constructor(
    private readonly repo: BackupStoragesRepository,
    private readonly copies: BackupCopiesRepository,
    private readonly remote: RemoteStorages,
    private readonly policies: BackupPolicyService,
  ) {}

  list(): BackupStorage[] {
    return this.repo.findAll().map(toView);
  }

  /** Stored row with the secret, for an audit diff only */
  snapshot(id: string): StoredStorage | null {
    return this.repo.findById(id);
  }

  get(id: string): BackupStorage {
    return toView(this.require(id));
  }

  create(input: StorageInput): BackupStorage {
    this.assertNameFree(input.name);
    const config = this.mergeConfig(undefined, input.config);
    return toView(this.repo.create({ name: input.name, driver: "s3", config }));
  }

  update(id: string, input: StorageInput): BackupStorage {
    const current = this.require(id);
    this.assertNameFree(input.name, id);
    const config = this.mergeConfig(current.config, input.config);
    // Stored copies point at objects in this exact place
    const moved = LOCATION_FIELDS.some(
      (field) => current.config[field] !== config[field],
    );
    if (moved && this.copies.countForStorage(id) > 0) {
      throw new ConflictException({
        code: "STORAGE_IN_USE",
        message:
          "Endpoint, bucket and folder cannot change while the storage holds backup copies",
      });
    }
    this.repo.update(id, { name: input.name, config });
    return this.get(id);
  }

  remove(id: string): void {
    this.require(id);
    const stored = this.copies.countForStorage(id);
    if (stored > 0) {
      throw new ConflictException({
        code: "STORAGE_IN_USE",
        message: `The storage still holds ${stored} backup copies, delete them first`,
      });
    }
    this.repo.delete(id);
    this.policies.forgetStorage(id);
  }

  private assertNameFree(name: string, exceptId?: string): void {
    const taken = this.repo
      .findAll()
      .some((s) => s.name === name && s.id !== exceptId);
    if (taken) {
      throw new ConflictException({
        code: "STORAGE_NAME_TAKEN",
        message: "A storage with this name already exists",
      });
    }
  }

  /** Checks a draft config, a saved storage fills in the secret it already has */
  async test(input: StorageInput, id?: string): Promise<void> {
    const current = id ? this.require(id).config : undefined;
    await this.remote.test(this.mergeConfig(current, input.config));
  }

  private mergeConfig(
    current: S3StorageConfig | undefined,
    incoming: StorageInput["config"],
  ): S3StorageConfig {
    return {
      ...incoming,
      secretAccessKey:
        resolveSecret(current?.secretAccessKey, incoming.secretAccessKey) ?? "",
    };
  }

  private require(id: string): StoredStorage {
    const storage = this.repo.findById(id);
    if (!storage) throw new NotFoundException("Storage not found");
    return storage;
  }
}

function toView(storage: StoredStorage): BackupStorage {
  return {
    ...storage,
    config: {
      ...storage.config,
      secretAccessKey: secretHint(storage.config.secretAccessKey),
    },
  };
}
