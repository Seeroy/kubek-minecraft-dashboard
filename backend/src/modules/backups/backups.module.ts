import { ServerAccessGuard } from "@/modules/auth/guards/server-access.guard";
import { FilesModule } from "@/modules/files/files.module";
import { ServersModule } from "@/modules/servers/servers.module";
import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { BackupsController } from "./backups.controller";
import { BackupsService } from "./backups.service";
import { BackupsRepository } from "./repositories/backups.repository";

@Module({
  imports: [TasksModule, FilesModule, ServersModule],
  controllers: [BackupsController],
  providers: [BackupsService, BackupsRepository, ServerAccessGuard],
  exports: [BackupsService],
})
export class BackupsModule {}
