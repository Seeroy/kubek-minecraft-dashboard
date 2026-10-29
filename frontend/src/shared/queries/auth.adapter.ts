import type { UserProfile } from "@/api";
import type { AccessMap } from "@shared/access/areas";
import { LEGACY_PERMISSION_ACCESS, legacyFromAccess } from "@shared/access/legacy";
import type { IUser } from "@shared/types/user.types";

export type SafeUser = Omit<IUser, "secret" | "password"> & {
  /** Old flat keys the levels cover plus extension keys, what extensions used to read */
  permissions: string[];
};

export const authAdapter = {
  // Bridge the API user (PublicUserDto) into the internal SafeUser shape
  toInternal: (user: UserProfile): SafeUser => ({
    ...user,
    grants: user.grants as AccessMap,
    access: { levels: user.access.levels as AccessMap, ext: user.access.ext },
    permissions: [...(user.isAdmin ? Object.keys(LEGACY_PERMISSION_ACCESS) : legacyFromAccess(user.access.levels as AccessMap)), ...user.access.ext],
    isAdmin: user.isAdmin ?? false,
  }),
};
