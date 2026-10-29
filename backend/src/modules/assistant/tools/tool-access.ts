import {
  can,
  canOnServer,
  canSeeServer,
  seesServers,
} from "@shared/access/can";
import type { IUser } from "@shared/types/user.types";
import type { AssistantTool, ToolAccess } from "./tool.types";

/** Level check without a server, decides which tools the model is offered */
export function hasToolAccess(user: IUser, tool: AssistantTool): boolean {
  if (tool.access === "serverView") return seesServers(user);
  const [area, level] = tool.access;
  return can(user, area, level);
}

function allowedOnServer(
  user: IUser,
  access: ToolAccess,
  serverId: string,
): boolean {
  if (access === "serverView") return canSeeServer(user, serverId);
  const [area, level] = access;
  return canOnServer(user, area, level, serverId);
}

const describeAccess = (access: ToolAccess) =>
  access === "serverView" ? "servers view" : access.join(" ");

/** Reason the user may not run the call, null when allowed */
export function denyReason(
  user: IUser,
  tool: AssistantTool,
  args: unknown,
  serverExists: (id: string) => boolean,
): string | null {
  if (!hasToolAccess(user, tool)) {
    return `Missing access ${describeAccess(tool.access)}`;
  }
  if (!tool.serverScoped) return null;
  const serverId = serverIdOf(args);
  const allowed =
    serverId !== null &&
    allowedOnServer(user, tool.access, serverId) &&
    serverExists(serverId);
  return allowed ? null : "Server not found, call list_servers for valid ids";
}

export function serverIdOf(args: unknown): string | null {
  const serverId = (args as { serverId?: unknown })?.serverId;
  return typeof serverId === "string" ? serverId : null;
}
