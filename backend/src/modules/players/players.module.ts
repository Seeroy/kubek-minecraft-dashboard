import { CompanionCoreModule } from "@/modules/companion/companion-core.module";
import { MojangModule } from "@/modules/mojang/mojang.module";
import { ServerTypesModule } from "@/modules/server-types/server-types.module";
import { ServersModule } from "@/modules/servers/servers.module";
import { Module } from "@nestjs/common";
import { LiveApplier } from "./apply/live.applier";
import { OfflineApplier } from "./apply/offline.applier";
import { PlayersController } from "./players.controller";
import { PlayersService } from "./players.service";
import { PlayersContextService } from "./players-context.service";
import { PlayersDataService } from "./players-data.service";
import { PlayersSettingsService } from "./players-settings.service";
import { PlayerProfileService } from "./profiles/profile.service";

@Module({
  imports: [
    ServersModule,
    ServerTypesModule,
    MojangModule,
    CompanionCoreModule,
  ],
  controllers: [PlayersController],
  providers: [
    PlayersService,
    PlayersSettingsService,
    PlayersContextService,
    PlayersDataService,
    PlayerProfileService,
    LiveApplier,
    OfflineApplier,
  ],
  exports: [PlayersService, PlayersDataService],
})
export class PlayersModule {}
