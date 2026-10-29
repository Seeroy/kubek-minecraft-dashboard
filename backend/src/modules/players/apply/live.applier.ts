import { ApiErrorCode } from "@/core/errors/error-codes";
import {
  ConflictException,
  GatewayTimeoutException,
  Injectable,
} from "@nestjs/common";
import type { PlayerList } from "@shared/types/players.types";
import { isApplied, type ListChange, type RawEntry } from "../lists/list-codec";
import { ListFileUnreadableError, readListFile } from "../lists/list-files";
import { commandFor } from "./console-commands";
import type { ApplyTarget, PlayerListApplier } from "./player-list.applier";
import { pollUntil } from "./poll";

// Server-written files do not reliably raise file.changed, so the file is polled
const CONFIRM_TIMEOUT_MS = 6000;
const POLL_INTERVAL_MS = 250;

/** Running server, it owns the files, the panel sends console commands */
@Injectable()
export class LiveApplier implements PlayerListApplier {
  async apply(
    { serverId, instance }: ApplyTarget,
    change: ListChange,
  ): Promise<void> {
    const before = await this.read(serverId, change.list);
    if (before && isApplied(before, change)) return;

    if (!instance.input(commandFor(change))) {
      throw new ConflictException({
        code: ApiErrorCode.SERVER_NOT_RUNNING,
        message: "Server is not running",
      });
    }

    const confirmed = await pollUntil(
      async () => {
        const raw = await this.read(serverId, change.list);
        return !!raw && isApplied(raw, change);
      },
      { timeoutMs: CONFIRM_TIMEOUT_MS, intervalMs: POLL_INTERVAL_MS },
    );
    if (!confirmed) {
      throw new GatewayTimeoutException({
        code: ApiErrorCode.PLAYERS_APPLY_TIMEOUT,
        message: "The server did not confirm the change, check the console",
      });
    }
  }

  private async read(
    serverId: string,
    list: PlayerList,
  ): Promise<RawEntry[] | null> {
    try {
      return await readListFile(serverId, list);
    } catch (error) {
      if (error instanceof ListFileUnreadableError) return null;
      throw error;
    }
  }
}
