import { ConfigModule } from "@/modules/config/config.module";
import { DatabaseModule } from "@/modules/database/database.module";
import { TelegramBotModule } from "@/modules/telegram-bot/telegram-bot.module";
import { forwardRef, Global, Module } from "@nestjs/common";
import { KubekController } from "./kubek.controller";
import { KubekService } from "./kubek.service";
import { UpdateCheckService } from "./update-check.service";

@Global()
@Module({
  imports: [DatabaseModule, forwardRef(() => TelegramBotModule), ConfigModule],
  controllers: [KubekController],
  providers: [KubekService, UpdateCheckService],
  exports: [KubekService],
})
export class KubekModule {}
