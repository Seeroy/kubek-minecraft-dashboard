import type { ExtUser } from "@kubekpanel/extension-sdk";
import {
  LEGACY_PERMISSION_ACCESS,
  legacyFromAccess,
} from "@shared/access/legacy";
import type { IUser } from "@shared/types/user.types";

/** Old flat keys the levels cover plus extension keys, what the SDK checks */
export function extPermissionsOf(user: IUser): string[] {
  const legacy = user.isAdmin
    ? Object.keys(LEGACY_PERMISSION_ACCESS)
    : legacyFromAccess(user.access.levels);
  return [...legacy, ...user.access.ext];
}

export function toExtUser(user: IUser): ExtUser {
  return {
    id: user.id,
    username: user.username,
    isAdmin: user.isAdmin,
    permissions: extPermissionsOf(user),
  };
}
