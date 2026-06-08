import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { AccountsModule } from "../accounts/accounts.module";
import { ConfigModule } from "../config/config.module";
import { DatabaseModule } from "../database/database.module";
import { JavaModule } from "../java/java.module";
import { StatsService } from "./stats.service";

@Module({
  imports: [
    JavaModule,
    DatabaseModule,
    ConfigModule,
    AccountsModule,
    ScheduleModule.forRoot(),
  ],
  providers: [StatsService],
  exports: [StatsService],
})
export class StatsModule {}
