import { DatabaseModule } from "@/modules/database/database.module";
import { ModrinthModule } from "@/modules/modrinth/modrinth.module";
import { ServerTypesModule } from "@/modules/server-types/server-types.module";
import { Module } from "@nestjs/common";
import { ModsController } from "./mods.controller";
import { ModsService } from "./mods.service";

@Module({
  imports: [DatabaseModule, ServerTypesModule, ModrinthModule],
  controllers: [ModsController],
  providers: [ModsService],
  exports: [ModsService],
})
export class ModsModule {}
