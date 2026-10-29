import { DatabaseModule } from "@/modules/database/database.module";
import { JavaModule } from "@/modules/java/java.module";
import { ModrinthModule } from "@/modules/modrinth/modrinth.module";
import { ServersModule } from "@/modules/servers/servers.module";
import { Module } from "@nestjs/common";
import { ModpackContentRegistrar } from "./modpack-content-registrar.service";
import { ModpackInspector } from "./modpack-inspector.service";
import { ModpackInstaller } from "./modpack-installer.service";
import { ModpackStagingService } from "./modpack-staging.service";
import { ModpacksController } from "./modpacks.controller";
import { ModpacksService } from "./modpacks.service";

@Module({
  imports: [DatabaseModule, JavaModule, ModrinthModule, ServersModule],
  controllers: [ModpacksController],
  providers: [
    ModpacksService,
    ModpackInspector,
    ModpackInstaller,
    ModpackContentRegistrar,
    ModpackStagingService,
  ],
})
export class ModpacksModule {}
