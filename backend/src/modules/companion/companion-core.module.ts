import { DatabaseModule } from "@/modules/database/database.module";
import { Module } from "@nestjs/common";
import { CompanionHubService } from "./companion-hub.service";

// Kept apart from CompanionModule: instances need the hub, the API needs instances
@Module({
  imports: [DatabaseModule],
  providers: [CompanionHubService],
  exports: [CompanionHubService],
})
export class CompanionCoreModule {}
