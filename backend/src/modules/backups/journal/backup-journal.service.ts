import { AppEventsService } from "@/core/events/app-events.service";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import type { BackupJournalEntry } from "@shared/types/backup.types";
import { BackupJournalRepository } from "../repositories/backup-journal.repository";

const RETENTION_MS = 90 * 24 * 60 * 60 * 1000;

@Injectable()
export class BackupJournalService implements OnModuleInit {
  private readonly logger = new Logger(BackupJournalService.name);

  constructor(
    private readonly repo: BackupJournalRepository,
    private readonly events: AppEventsService,
  ) {}

  onModuleInit(): void {
    this.events.on("backup.operation", (entry) => this.repo.create(entry));
  }

  list(
    serverId: string,
    opts: { limit: number; before?: { createdAt: number; id: string } },
  ): BackupJournalEntry[] {
    return this.repo.findByServer(serverId, opts);
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  prune(): void {
    const removed = this.repo.deleteOlderThan(Date.now() - RETENTION_MS);
    if (removed > 0)
      this.logger.log(`Pruned ${removed} backup journal entries`);
  }
}
