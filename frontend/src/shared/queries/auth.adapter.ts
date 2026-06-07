import type { UserProfile } from "@/api";
import type { IUser, UserPermissions } from "@shared/types/user.types";

export type SafeUser = Omit<IUser, "secret" | "password">;

export const authAdapter = {
  // Bridge the API user (PublicUserDto) into the internal SafeUser shape
  toInternal: (user: UserProfile): SafeUser => ({
    ...user,
    permissions: user.permissions.map((p) => p as UserPermissions),
    isAdmin: user.isAdmin ?? false,
  }),
};
