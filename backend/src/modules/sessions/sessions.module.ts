import { Global, Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { SessionsController } from "./sessions.controller";
import { SessionsService } from "./sessions.service";

@Global()
@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
