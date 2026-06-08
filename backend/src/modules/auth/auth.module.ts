import { AccountsModule } from "@/modules/accounts/accounts.module";
import { ConfigModule } from "@/modules/config/config.module";
import { TelegramBotModule } from "@/modules/telegram-bot/telegram-bot.module";
import { Global, Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TwofaModule } from "./twofa/twofa.module";

@Global()
@Module({
  imports: [AccountsModule, ConfigModule, TelegramBotModule, TwofaModule],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService, TwofaModule],
})
export class AuthModule {}
