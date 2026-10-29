import { Injectable } from "@nestjs/common";
import { applyChange, type ListChange } from "../lists/list-codec";
import { readListFileOrFail, writeListFile } from "../lists/list-files";
import type { ApplyTarget, PlayerListApplier } from "./player-list.applier";

/** Stopped server, the panel owns the files */
@Injectable()
export class OfflineApplier implements PlayerListApplier {
  async apply({ serverId }: ApplyTarget, change: ListChange): Promise<void> {
    const raw = await readListFileOrFail(serverId, change.list);
    await writeListFile(serverId, change.list, applyChange(raw, change));
  }
}
