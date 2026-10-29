import { updatePropertiesFile } from "@/core/properties/properties-file";
import { getRealServerPath } from "@/core/utils/serverPath";
import { Injectable } from "@nestjs/common";
import type { PlayersOverview } from "@shared/types/players.types";
import { whitelistToggleCommand } from "./apply/console-commands";
import { pollUntil } from "./apply/poll";
import type { UpdatePlayersSettingsDto } from "./dto/player-requests.dto";
import {
  type PlayersContext,
  PlayersContextService,
} from "./players-context.service";
import { readPlayersSettings } from "./players-support";

const TOGGLE_TIMEOUT_MS = 4000;
const POLL_INTERVAL_MS = 250;

/** white-list and enforce-whitelist in server.properties */
@Injectable()
export class PlayersSettingsService {
  constructor(private readonly contexts: PlayersContextService) {}

  async update(
    serverId: string,
    dto: UpdatePlayersSettingsDto,
  ): Promise<PlayersOverview> {
    const context = await this.contexts.loadWritable(serverId);
    await this.toggleLive(context, dto.whitelist);

    const doc = await updatePropertiesFile(
      await getRealServerPath(serverId, "server.properties"),
      (props) => {
        if (dto.whitelist !== undefined) {
          props.set("white-list", String(dto.whitelist));
        }
        if (dto.enforceWhitelist !== undefined) {
          props.set("enforce-whitelist", String(dto.enforceWhitelist));
        }
      },
    );
    return this.contexts.overview(context, readPlayersSettings(doc.toRecord()));
  }

  // A running server rewrites server.properties from memory on this command,
  // so it has to land before the panel edits the file
  private async toggleLive(context: PlayersContext, enabled?: boolean) {
    if (!context.live || enabled === undefined) return;
    if (enabled === context.settings.whitelist) return;
    if (!context.instance.input(whitelistToggleCommand(enabled))) return;

    await pollUntil(
      async () => {
        const props = await context.instance.readServerProperties();
        return readPlayersSettings(props).whitelist === enabled;
      },
      { timeoutMs: TOGGLE_TIMEOUT_MS, intervalMs: POLL_INTERVAL_MS },
    );
  }
}
