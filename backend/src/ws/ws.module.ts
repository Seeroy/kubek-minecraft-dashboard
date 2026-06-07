import { DatabaseModule } from "@/modules/database/database.module";
import { SystemMonitoringModule } from "@/modules/system-monitoring/system-monitoring.module";
import { TelegramBotModule } from "@/modules/telegram-bot/telegram-bot.module";
import { ServerGateway } from "@/ws/server.gateway";
import { AuthService } from "@/ws/services/auth.service";
import { CommandHandlerService } from "@/ws/services/command-handler.service";
import { RoomService } from "@/ws/services/room.service";
import { WsScheduledService } from "@/ws/services/scheduled.service";
import { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import { TasksEventsService } from "@/ws/services/task-events.service";
import { Global, Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ServerEventsService } from "./services/server-events.service";

@Global()
@Module({
  imports: [
    ScheduleModule.forRoot(),
    DatabaseModule,
    TelegramBotModule,
    SystemMonitoringModule,
  ],
  providers: [
    ServerGateway,
    AuthService,
    RoomService,
    TasksEventsService,
    ServerEventsService,
    WsScheduledService,
    ServerBroadcastService,
    CommandHandlerService,
  ],
  exports: [ServerGateway, ServerEventsService, ServerBroadcastService],
})
export class WsModule {}
