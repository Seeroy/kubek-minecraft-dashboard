import { DatabaseModule } from "@/modules/database/database.module";
import { ServerTypesModule } from "@/modules/server-types/server-types.module";
import { Module } from "@nestjs/common";
import { CompanionAlertsService } from "./companion-alerts.service";
import { CompanionCoreModule } from "./companion-core.module";
import { CompanionJobsService } from "./companion-jobs.service";
import { CompanionController } from "./companion.controller";
import { CompanionService } from "./companion.service";
import { CompanionInstallerService } from "./install/companion-installer.service";

@Module({
  imports: [DatabaseModule, ServerTypesModule, CompanionCoreModule],
  controllers: [CompanionController],
  providers: [
    CompanionService,
    CompanionInstallerService,
    CompanionJobsService,
    CompanionAlertsService,
  ],
  exports: [CompanionService, CompanionInstallerService],
})
export class CompanionModule {}
