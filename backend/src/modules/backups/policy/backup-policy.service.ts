import { ConfigService } from "@/modules/config/config.service";
import { Injectable, NotFoundException } from "@nestjs/common";
import type {
  BackupPolicy,
  ServerBackupPolicy,
} from "@shared/types/backup.types";
import { BackupPoliciesRepository } from "../repositories/backup-policies.repository";
import { BackupStoragesRepository } from "../repositories/backup-storages.repository";

const DEFAULTS_KEY = "backupDefaults";

// Nothing is deleted or uploaded until someone asks for it
const BUILT_IN: BackupPolicy = {
  local: { keepCount: null, keepDays: null },
  remote: {
    storageId: null,
    keepCount: null,
    keepDays: null,
    uploadMode: "manual",
    deleteLocalAfterUpload: false,
  },
};

@Injectable()
export class BackupPolicyService {
  constructor(
    private readonly repo: BackupPoliciesRepository,
    private readonly config: ConfigService,
    private readonly storages: BackupStoragesRepository,
  ) {}

  getDefaults(): BackupPolicy {
    return (
      (this.config.get(DEFAULTS_KEY) as BackupPolicy | undefined) ?? BUILT_IN
    );
  }

  setDefaults(policy: BackupPolicy): BackupPolicy {
    this.assertStorage(policy);
    this.config.set(DEFAULTS_KEY, policy);
    return policy;
  }

  forServer(serverId: string): ServerBackupPolicy {
    const own = this.repo.find(serverId);
    return { serverId, custom: !!own, ...(own ?? this.getDefaults()) };
  }

  /** null drops the server policy so the panel defaults apply again */
  setForServer(
    serverId: string,
    policy: BackupPolicy | null,
  ): ServerBackupPolicy {
    if (policy) {
      this.assertStorage(policy);
      this.repo.upsert(serverId, policy);
    } else this.repo.delete(serverId);
    return this.forServer(serverId);
  }

  /** Servers lose the storage through the foreign key, the defaults live in config */
  forgetStorage(storageId: string): void {
    const defaults = this.getDefaults();
    if (defaults.remote.storageId !== storageId) return;
    this.config.set(DEFAULTS_KEY, {
      ...defaults,
      remote: { ...defaults.remote, storageId: null, uploadMode: "manual" },
    });
  }

  private assertStorage({ remote }: BackupPolicy): void {
    if (remote.storageId && !this.storages.findById(remote.storageId)) {
      throw new NotFoundException({
        code: "STORAGE_NOT_FOUND",
        message: "Storage not found",
      });
    }
  }
}
