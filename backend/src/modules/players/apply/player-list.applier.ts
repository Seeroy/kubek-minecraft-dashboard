import type { ServerInstance } from "@/modules/instances/instance";
import type { ListChange } from "../lists/list-codec";

export interface ApplyTarget {
  serverId: string;
  instance: ServerInstance;
}

/** Puts a list change into effect, through the console or the files */
export interface PlayerListApplier {
  apply(target: ApplyTarget, change: ListChange): Promise<void>;
}
