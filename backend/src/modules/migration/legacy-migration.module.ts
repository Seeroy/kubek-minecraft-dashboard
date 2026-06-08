import { Module } from "@nestjs/common";
import { LegacyMigrationService } from "./legacy-migration.service";

// Runs the one-time import of legacy Kubek data on startup
@Module({
  providers: [LegacyMigrationService],
})
export class LegacyMigrationModule {}
