import { DatabaseModule } from "@/modules/database/database.module";
import { ServerTypesModule } from "@/modules/server-types/server-types.module";
import { Module } from "@nestjs/common";
import { PluginsController } from "./plugins.controller";
import { PluginsService } from "./plugins.service";

@Module({
  imports: [DatabaseModule, ServerTypesModule],
  controllers: [PluginsController],
  providers: [PluginsService],
  exports: [PluginsService],
})
export class PluginsModule {}
