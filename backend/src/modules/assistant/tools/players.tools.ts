import { PLAYER_NAME } from "@/modules/players/players.constants";
import { PlayersService } from "@/modules/players/players.service";
import { Injectable } from "@nestjs/common";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import { AccessArea } from "@shared/access/areas";
import { canOnServer } from "@shared/access/can";
import type { IUser } from "@shared/types/user.types";
import { z } from "zod";
import { json, serverArgs, text } from "./tool-args";
import { type AssistantTool, type ToolGroup, defineTool } from "./tool.types";

const ACTIONS = [
  "whitelist_add",
  "whitelist_remove",
  "op",
  "deop",
  "ban",
  "pardon",
  "kick",
] as const;

type PlayerAction = (typeof ACTIONS)[number];

const AUDIT: Record<PlayerAction, string> = {
  whitelist_add: AuditAction.PLAYERS_WHITELIST_ADD,
  whitelist_remove: AuditAction.PLAYERS_WHITELIST_REMOVE,
  op: AuditAction.PLAYERS_OP,
  deop: AuditAction.PLAYERS_DEOP,
  ban: AuditAction.PLAYERS_BAN,
  pardon: AuditAction.PLAYERS_PARDON,
  kick: AuditAction.PLAYERS_KICK,
};

const manageArgs = serverArgs({
  action: z.enum(ACTIONS),
  name: z.string().regex(PLAYER_NAME, "Invalid player name"),
  reason: z.string().max(256).optional().describe("For ban and kick"),
});

type ManageArgs = z.infer<typeof manageArgs>;

// Ops and bans need manage like their HTTP endpoints, whitelist and kick need write
const MANAGE_ACTIONS = new Set<PlayerAction>(["op", "deop", "ban", "pardon"]);

@Injectable()
export class PlayersTools implements ToolGroup {
  constructor(private readonly players: PlayersService) {}

  tools(): AssistantTool[] {
    return [this.listPlayers(), this.managePlayer()];
  }

  private listPlayers() {
    return defineTool({
      name: "list_players",
      description:
        "Whitelist, operators, bans and whitelist settings of a server",
      kind: "read",
      access: [AccessArea.PLAYERS, "read"],
      serverScoped: true,
      args: serverArgs({}),
      run: async (_ctx, { serverId }) =>
        json(await this.players.overview(serverId)),
    });
  }

  private managePlayer() {
    return defineTool<ManageArgs>({
      name: "manage_player",
      description:
        "Whitelist, op, ban or kick a player. Kick needs a running server",
      kind: "write",
      access: [AccessArea.PLAYERS, "write"],
      serverScoped: true,
      args: manageArgs,
      preview: (_ctx, { action, name, reason }) =>
        Promise.resolve({
          type: "summary",
          title: `${action.replace("_", " ")} ${name}`,
          lines: reason ? [`reason: ${reason}`] : [],
        }),
      run: async ({ user }, args) => {
        if (
          MANAGE_ACTIONS.has(args.action) &&
          !canOnServer(user, AccessArea.PLAYERS, "manage", args.serverId)
        ) {
          throw new Error("Missing access players manage");
        }
        await this.apply(user, args);
        return text("Done");
      },
      audit: ({ action, name }) => ({
        action: AUDIT[action],
        category: AuditCategory.SERVER,
        resourceName: name,
      }),
    });
  }

  private async apply(
    user: IUser,
    { serverId, action, name, reason }: ManageArgs,
  ) {
    switch (action) {
      case "whitelist_add":
        return this.players.addToWhitelist(serverId, name);
      case "whitelist_remove":
        return this.players.remove(serverId, "whitelist", name);
      case "op":
        return this.players.addOp(serverId, { name });
      case "deop":
        return this.players.remove(serverId, "ops", name);
      case "ban":
        return this.players.addBan(serverId, { name, reason }, user);
      case "pardon":
        return this.players.remove(serverId, "bans", name);
      case "kick":
        return this.players.kick(serverId, { name, reason });
    }
  }
}
