import { FilesModule } from "@/modules/files/files.module";
import { Module } from "@nestjs/common";
import { ServerLogsController } from "./server-logs.controller";
import { ServerLogsService } from "./server-logs.service";

@Module({
  imports: [FilesModule],
  controllers: [ServerLogsController],
  providers: [ServerLogsService],
})
export class ServerLogsModule {}
