import { ForbiddenException } from "@nestjs/common";
import { AccessArea, type AccessLevel } from "@shared/access/areas";
import { canOnServer } from "@shared/access/can";
import { SchedulerActionType } from "@shared/types/scheduler.types";
import type { IUser } from "@shared/types/user.types";

// A task acts for its owner, so it needs what the same action needs by hand
const ACTION_ACCESS: Record<
  SchedulerActionType,
  [AccessArea, AccessLevel] | null
> = {
  [SchedulerActionType.SERVER_START]: [AccessArea.POWER, "write"],
  [SchedulerActionType.SERVER_STOP]: [AccessArea.POWER, "write"],
  [SchedulerActionType.SERVER_RESTART]: [AccessArea.POWER, "write"],
  [SchedulerActionType.SERVER_COMMAND]: [AccessArea.CONSOLE, "write"],
  [SchedulerActionType.BACKUP_CREATE]: [AccessArea.BACKUPS, "write"],
  [SchedulerActionType.HTTP_WEBHOOK]: null,
};

export function canRunAction(
  user: IUser | null | undefined,
  type: SchedulerActionType,
  serverId: string,
): boolean {
  const needed = ACTION_ACCESS[type];
  return (
    canOnServer(user, AccessArea.SCHEDULER, "write", serverId) &&
    (!needed || canOnServer(user, needed[0], needed[1], serverId))
  );
}

export function assertCanRunAction(
  user: IUser,
  type: SchedulerActionType,
  serverId: string,
): void {
  if (!canRunAction(user, type, serverId)) {
    throw new ForbiddenException(
      "You can't schedule an action you can't run yourself",
    );
  }
}
