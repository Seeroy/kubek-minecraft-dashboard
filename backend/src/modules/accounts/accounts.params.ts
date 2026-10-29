import type { IUser } from "@shared/types/user.types";
import type { Request } from "express";

// Express 5 types route params as string | string[]
export function usernameParam(req: {
  params?: Record<string, string | string[]>;
}): string | undefined {
  const value = req.params?.username;
  return Array.isArray(value) ? value[0] : value;
}

export function currentUsername(req: Request): string | undefined {
  return (req as Request & { user?: IUser }).user?.username;
}
