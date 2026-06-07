import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import { BackupsModule } from "@/modules/backups/backups.module";
import { Module } from "@nestjs/common";
import { ScheduledTasksController } from "./scheduled-tasks.controller";
import { ScheduledTasksService } from "./scheduled-tasks.service";

@Module({
  imports: [BackupsModule],
  controllers: [ScheduledTasksController],
  providers: [ScheduledTasksService, ServerAccessGuard],
  exports: [ScheduledTasksService],
})
export class ScheduledTasksModule {}
