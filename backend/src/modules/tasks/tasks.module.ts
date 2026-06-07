import { AccountsModule } from "@/modules/accounts/accounts.module";
import { TelegramBotModule } from "@/modules/telegram-bot/telegram-bot.module";
import { TasksEventsService } from "@/ws/services/task-events.service";
import { WsModule } from "@/ws/ws.module";
import { Global, Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { TasksController } from "./tasks.controller";
import { TasksService } from "./tasks.service";

@Global()
@Module({
  imports: [
    WsModule,
    TelegramBotModule,
    AccountsModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksEventsService],
  exports: [TasksService],
})
export class TasksModule {}
