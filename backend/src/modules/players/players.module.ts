import { MojangModule } from "@/modules/mojang/mojang.module";
import { ServerTypesModule } from "@/modules/server-types/server-types.module";
import { ServersModule } from "@/modules/servers/servers.module";
import { Module } from "@nestjs/common";
import { LiveApplier } from "./apply/live.applier";
import { OfflineApplier } from "./apply/offline.applier";
import { PlayersController } from "./players.controller";
import { PlayersService } from "./players.service";
import { PlayersContextService } from "./players-context.service";
import { PlayersSettingsService } from "./players-settings.service";
import { PlayerProfileService } from "./profiles/profile.service";

@Module({
  imports: [ServersModule, ServerTypesModule, MojangModule],
  controllers: [PlayersController],
  providers: [
    PlayersService,
    PlayersSettingsService,
    PlayersContextService,
    PlayerProfileService,
    LiveApplier,
    OfflineApplier,
  ],
  exports: [PlayersService],
})
export class PlayersModule {}
