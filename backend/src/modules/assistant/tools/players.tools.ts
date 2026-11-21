import { PLAYER_NAME } from "@/modules/players/players.constants";
import { PlayersService } from "@/modules/players/players.service";
import { PlayersDataService } from "@/modules/players/players-data.service";
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

const playerArg = z
  .string()
  .min(1)
  .max(36)
  .describe("Player UUID, or the name of a player the server has seen");

const GAMEMODES = ["survival", "creative", "adventure", "spectator"] as const;
const MAX_COORD = 30_000_000;
const coord = z.number().min(-MAX_COORD).max(MAX_COORD);

const findArgs = serverArgs({
  search: z.string().max(64).optional().describe("Part of a name or UUID"),
  page: z.number().int().min(0).default(0),
  pageSize: z.number().int().min(1).max(50).default(25),
});

const playerArgs = serverArgs({ player: playerArg });

const commandArgs = serverArgs({
  action: z.enum(["gamemode", "teleport", "heal", "feed"]),
  name: z.string().regex(PLAYER_NAME, "Invalid player name"),
  gamemode: z.enum(GAMEMODES).optional().describe("For gamemode"),
  x: coord.optional().describe("For teleport"),
  y: z.number().min(-4096).max(4096).optional().describe("For teleport"),
  z: coord.optional().describe("For teleport"),
  dimension: z
    .string()
    .regex(/^[a-z0-9_.-]+:[a-z0-9_./-]+$/)
    .optional()
    .describe(
      "For teleport, e.g. minecraft:the_nether, the current one when omitted",
    ),
});

type CommandArgs = z.infer<typeof commandArgs>;

const COMMAND_AUDIT: Record<CommandArgs["action"], string> = {
  gamemode: AuditAction.PLAYERS_GAMEMODE,
  teleport: AuditAction.PLAYERS_TELEPORT,
  heal: AuditAction.PLAYERS_HEAL,
  feed: AuditAction.PLAYERS_FEED,
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
  constructor(
    private readonly players: PlayersService,
    private readonly data: PlayersDataService,
  ) {}

  tools(): AssistantTool[] {
    return [
      this.listPlayers(),
      this.findPlayers(),
      this.getPlayer(),
      this.managePlayer(),
      this.playerCommand(),
      this.resetPlayer(),
    ];
  }

  private findPlayers() {
    return defineTool({
      name: "find_players",
      description:
        "Players who have ever joined a server, newest save first, with paging and search by name or UUID",
      kind: "read",
      access: [AccessArea.PLAYERS, "read"],
      serverScoped: true,
      args: findArgs,
      run: async (_ctx, { serverId, ...query }) =>
        json(await this.data.list(serverId, query)),
    });
  }

  private getPlayer() {
    return defineTool({
      name: "get_player",
      description:
        "Saved game mode, health, food, level, position, last death and statistics of one player. For an online player the save can be a few minutes old",
      kind: "read",
      access: [AccessArea.PLAYERS, "read"],
      serverScoped: true,
      args: playerArgs,
      run: async (_ctx, { serverId, player }) =>
        json(await this.data.details(serverId, player)),
    });
  }

  private playerCommand() {
    return defineTool<CommandArgs>({
      name: "player_command",
      description:
        "Change game mode, teleport, heal or feed an online player through the console. The server doesn't confirm it, check the console if it matters",
      kind: "write",
      access: [AccessArea.PLAYERS, "write"],
      serverScoped: true,
      args: commandArgs,
      preview: (_ctx, args) =>
        Promise.resolve({
          type: "summary",
          title: `${args.action} ${args.name}`,
          lines: commandLines(args),
        }),
      run: async (_ctx, args) => {
        await this.runCommand(args);
        return text("Command sent");
      },
      audit: ({ action, name }) => ({
        action: COMMAND_AUDIT[action],
        category: AuditCategory.SERVER,
        resourceName: name,
      }),
    });
  }

  private resetPlayer() {
    return defineTool({
      name: "reset_player_data",
      description:
        "Delete a player's inventory, position, statistics and advancements so they start over. Lists and bans stay. Refused while they may be online, can't be undone",
      kind: "write",
      access: [AccessArea.PLAYERS, "manage"],
      serverScoped: true,
      args: playerArgs,
      preview: (_ctx, { player }) =>
        Promise.resolve({
          type: "summary",
          title: `Reset progress of ${player}`,
          lines: [
            "Inventory, position, statistics and advancements are deleted",
          ],
        }),
      run: async (_ctx, { serverId, player }) => {
        const { uuid } = await this.data.details(serverId, player);
        const { deleted } = await this.data.reset(serverId, uuid);
        return text(`Removed ${deleted} file(s)`);
      },
      audit: ({ player }) => ({
        action: AuditAction.PLAYERS_RESET_DATA,
        category: AuditCategory.SERVER,
        resourceName: player,
      }),
    });
  }

  private runCommand(args: CommandArgs): Promise<void> {
    const { serverId, name } = args;
    switch (args.action) {
      case "gamemode":
        if (!args.gamemode) throw new Error("gamemode is required");
        return this.players.setGamemode(serverId, {
          name,
          gamemode: args.gamemode,
        });
      case "teleport": {
        const { x, y, z, dimension } = args;
        if (x === undefined || y === undefined || z === undefined) {
          throw new Error("x, y and z are required");
        }
        return this.players.teleport(serverId, { name, x, y, z, dimension });
      }
      case "heal":
        return this.players.heal(serverId, name);
      case "feed":
        return this.players.feed(serverId, name);
    }
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

function commandLines(args: CommandArgs): string[] {
  if (args.action === "gamemode") return [`mode: ${args.gamemode ?? "?"}`];
  if (args.action !== "teleport") return [];
  const where = `${args.x ?? "?"} ${args.y ?? "?"} ${args.z ?? "?"}`;
  return [args.dimension ? `${where} in ${args.dimension}` : where];
}
