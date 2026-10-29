import type { IUser } from "@shared/types/user.types";

export interface PublicUser {
  id: string;
  username: string;
  roles: IUser["roles"];
  grants: IUser["grants"];
  extPermissions: IUser["extPermissions"];
  access: IUser["access"];
  serversRestrict: IUser["serversRestrict"];
  isAdmin: boolean;
  oobeCompleted: boolean;
  skinName: string | null;
  ftpPasswordSetAt: number | null;
}

/** Convert IUser to public exposed type */
export function toPublicUser(user: IUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    roles: user.roles,
    grants: user.grants,
    extPermissions: user.extPermissions,
    access: user.access,
    serversRestrict: user.serversRestrict,
    isAdmin: !!user.isAdmin,
    oobeCompleted: !!user.oobeCompleted,
    skinName: user.skinName ?? null,
    ftpPasswordSetAt: user.ftpPasswordSetAt ?? null,
  };
}
