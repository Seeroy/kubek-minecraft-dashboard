import { Global, Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { PasswordRecheckService } from "./password-recheck.service";
import { RateLimitService } from "./rate-limit.service";

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  providers: [RateLimitService, PasswordRecheckService],
  exports: [RateLimitService, PasswordRecheckService],
})
export class RateLimitModule {}
