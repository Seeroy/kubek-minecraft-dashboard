import { AccountsModule } from "@/modules/accounts/accounts.module";
import { TelegramBotModule } from "@/modules/telegram-bot/telegram-bot.module";
import { Module } from "@nestjs/common";
import { TwofaController } from "./twofa.controller";
import { TwofaService } from "./twofa.service";

@Module({
  imports: [AccountsModule, TelegramBotModule],
  providers: [TwofaService],
  controllers: [TwofaController],
  exports: [TwofaService],
})
export class TwofaModule {}
