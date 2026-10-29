import type {
  NotificationKind,
  NotificationKindSpec,
  NotificationParamsMap,
} from "@shared/types/notification.types";
import type { AccessArea, AccessLevel } from "@shared/access/areas";
import type { IUser } from "@shared/types/user.types";

/** One user, everyone with a level on a server, or panel wide */
export type NotificationAudience =
  | { userId: string }
  | { serverId: string; area: AccessArea; level: AccessLevel }
  | { area: AccessArea; level: AccessLevel };

export interface NotificationDraft<
  K extends NotificationKind = NotificationKind,
> {
  kind: K;
  params: NotificationParamsMap[K];
  audience: NotificationAudience;
}

export interface NotificationDelivery<
  K extends NotificationKind = NotificationKind,
> {
  kind: K;
  params: NotificationParamsMap[K];
  spec: NotificationKindSpec;
}

export interface NotificationChannelHandler {
  deliver(user: IUser, delivery: NotificationDelivery): Promise<void>;
}
