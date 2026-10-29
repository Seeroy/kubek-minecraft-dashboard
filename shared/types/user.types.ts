import type { AccessMap } from "../access/areas";
import type { UserAccess } from "../access/can";

export interface IUser {
  id: string;
  username: string;
  password: string;
  /** Assigned role ids */
  roles: string[];
  /** Personal levels on top of the roles */
  grants: AccessMap;
  /** Personal extension permission keys */
  extPermissions: string[];
  /** Effective access from roles and personal grants, computed on read */
  access: UserAccess;
  serversRestrict: UserServersRestrict;
  isAdmin?: boolean;
  oobeCompleted?: boolean;
  totpSecret?: string | null;
  totpEnabled?: boolean;
  telegram2faEnabled?: boolean;
  twofaPrimary?: TwoFactorMethod | null;
  /** Serialized dashboard layout (widget visibility + grid positions per breakpoint) */
  dashboardLayout?: string | null;
  /** Panel version for which this user last saw the what's-new modal */
  lastSeenWhatsNewVersion?: string | null;
  /** Minecraft nickname whose skin is shown as the avatar, username is used when empty */
  skinName?: string | null;
  /** When the FTP password was set, null if there's none */
  ftpPasswordSetAt?: number | null;
}

export type TwoFactorMethod = "totp" | "telegram";

export interface UserServersRestrict {
  enabled: boolean;
  allowed: string[];
}

