import { ConfigService } from "@/modules/config/config.service";
import {
  AuditLogsRepository,
  type PruneRule,
} from "@/modules/database/repositories/audit-logs.repository";
import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  AuditAction,
  AuditCategory,
  type AuditRetention,
  type AuditRetentionState,
} from "@shared/types/audit.types";
import { AuditLogService } from "../audit-log.service";

const KEY = "auditRetention";
const DAY_MS = 86_400_000;

// Half a year and a thousand entries until someone sets their own limits
const DEFAULTS: AuditRetention = { keepDays: 180, maxEntries: 1000 };

@Injectable()
export class AuditRetentionService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AuditRetentionService.name);

  constructor(
    private readonly repo: AuditLogsRepository,
    private readonly config: ConfigService,
    private readonly audit: AuditLogService,
  ) {}

  get(): AuditRetention {
    const stored = this.config.get(KEY) as Partial<AuditRetention> | undefined;
    return { ...DEFAULTS, ...stored };
  }

  state(): AuditRetentionState {
    return { retention: this.get(), ...this.repo.stats() };
  }

  /**
   * Saved limits apply right away, not on the next hourly pass. The prune
   * waits a tick so its entry lands after the one about the change
   */
  set(retention: AuditRetention): AuditRetention {
    this.config.set(KEY, retention);
    setImmediate(() => this.prune());
    return retention;
  }

  /** How many entries a draft would remove now */
  preview(retention: AuditRetention): number {
    return this.repo.countPrunable(ruleOf(retention));
  }

  onApplicationBootstrap(): void {
    this.prune();
  }

  @Cron(CronExpression.EVERY_HOUR)
  prune(): number {
    try {
      const retention = this.get();
      const removed = this.repo.prune(ruleOf(retention));
      if (removed > 0) this.recordPrune(removed, retention);
      return removed;
    } catch (error) {
      this.logger.error(`Audit log rotation failed: ${String(error)}`);
      return 0;
    }
  }

  // Removing entries is itself on record, so a wipe never goes unnoticed
  private recordPrune(removed: number, retention: AuditRetention): void {
    this.logger.log(`Audit log rotation removed ${removed} entries`);
    this.audit.record({
      action: AuditAction.AUDIT_PRUNE,
      category: AuditCategory.SETTINGS,
      resourceType: "audit_retention",
      username: "system",
      source: "system",
      details: { removed, ...retention },
    });
  }
}

function ruleOf({ keepDays, maxEntries }: AuditRetention): PruneRule {
  return {
    before: keepDays ? Date.now() - keepDays * DAY_MS : null,
    keep: maxEntries,
  };
}
