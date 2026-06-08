import type { IUser } from "@shared/types/user.types";

export interface PublicUser {
  id: string;
  username: string;
  permissions: IUser["permissions"];
  serversRestrict: IUser["serversRestrict"];
  isAdmin?: boolean;
  oobeCompleted: boolean;
}

/** Convert IUser to public exposed type */
export function toPublicUser(user: IUser): PublicUser {
  return {
    id: user.id,
    username: user.username,
    permissions: user.permissions,
    serversRestrict: user.serversRestrict,
    isAdmin: user.isAdmin,
    oobeCompleted: !!user.oobeCompleted,
  };
}
