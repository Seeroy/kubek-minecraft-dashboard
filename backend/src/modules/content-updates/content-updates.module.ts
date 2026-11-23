import { DatabaseModule } from "@/modules/database/database.module";
import { ModsModule } from "@/modules/mods/mods.module";
import { PluginsModule } from "@/modules/plugins/plugins.module";
import { Module } from "@nestjs/common";
import { ContentUpdatesService } from "./content-updates.service";

@Module({
  imports: [DatabaseModule, PluginsModule, ModsModule],
  providers: [ContentUpdatesService],
})
export class ContentUpdatesModule {}
