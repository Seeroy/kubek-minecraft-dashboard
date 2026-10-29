import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import { BackupsModule } from "@/modules/backups/backups.module";
import { Module } from "@nestjs/common";
import { CronRegistrar } from "./cron-registrar";
import { ScheduledTaskExecutor } from "./scheduled-task-executor";
import { ScheduledTasksController } from "./scheduled-tasks.controller";
import { ScheduledTasksService } from "./scheduled-tasks.service";
import { WebhookClient } from "./webhook-client";

@Module({
  imports: [BackupsModule],
  controllers: [ScheduledTasksController],
  providers: [
    ScheduledTasksService,
    ScheduledTaskExecutor,
    CronRegistrar,
    WebhookClient,
    ServerAccessGuard,
  ],
  exports: [ScheduledTasksService],
})
export class ScheduledTasksModule {}
