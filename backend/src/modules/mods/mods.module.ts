import { DatabaseModule } from "@/modules/database/database.module";
import { ServerTypesModule } from "@/modules/server-types/server-types.module";
import { Module } from "@nestjs/common";
import { ModsController } from "./mods.controller";
import { ModsService } from "./mods.service";

@Module({
  imports: [DatabaseModule, ServerTypesModule],
  controllers: [ModsController],
  providers: [ModsService],
  exports: [ModsService],
})
export class ModsModule {}
