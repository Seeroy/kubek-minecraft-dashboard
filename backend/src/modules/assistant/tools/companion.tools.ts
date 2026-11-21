import { getErrorMessage } from "@/core/utils/error";
import { COMPANION_EVENT_TYPES } from "@/modules/companion/dto/companion-responses.dto";
import { CompanionService } from "@/modules/companion/companion.service";
import { Injectable } from "@nestjs/common";
import { AccessArea } from "@shared/access/areas";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import { z } from "zod";
import { failure, json, serverArgs, text } from "./tool-args";
import {
  type AssistantTool,
  type ToolGroup,
  type ToolResult,
  defineTool,
} from "./tool.types";

const NOT_CONNECTED =
  "Kubek Companion is not connected on this server. It runs on Paper, Spigot, Purpur and Folia and can be installed from the plugins page";

const UNSUPPORTED =
  "This server type can't run Kubek Companion, it needs a plugin core: Paper, Spigot, Purpur or Folia";

const MB = 1024 * 1024;

/** Live data from the Kubek Companion plugin */
@Injectable()
export class CompanionTools implements ToolGroup {
  constructor(private readonly companion: CompanionService) {}

  tools(): AssistantTool[] {
    return [
      this.performance(),
      this.lagReport(),
      this.livePlugins(),
      this.playerActivity(),
      this.broadcast(),
    ];
  }

  private performance() {
    return defineTool({
      name: "get_performance",
      description:
        "TPS, MSPT, JVM heap and GC, worlds and online players of a running server, plus the last hour of TPS. Needs Kubek Companion",
      kind: "read",
      access: "serverView",
      serverScoped: true,
      args: serverArgs({}),
      run: (_ctx, { serverId }) => {
        const stats = this.companion.liveStats(serverId);
        if (!stats) return Promise.resolve(this.unavailable(serverId));
        const hour = this.companion
          .metricsRange(serverId, "1h")
          .map((p) => p.tpsMin)
          .filter((v): v is number => v != null);
        return Promise.resolve(
          json({
            tps: {
              "1m": stats.tps?.[0],
              "5m": stats.tps?.[1],
              "15m": stats.tps?.[2],
            },
            lowestTpsLastHour: hour.length ? Math.min(...hour) : null,
            mspt: stats.mspt,
            heapMb: {
              used: Math.round(stats.jvm.heapUsed / MB),
              max: Math.round(stats.jvm.heapMax / MB),
            },
            gcLastInterval: stats.jvm.gc,
            threads: stats.jvm.threads,
            online: `${stats.online}/${stats.maxPlayers}`,
            worlds: stats.worlds,
            players: stats.players.map((p) => ({
              name: p.name,
              world: p.world,
              ping: p.ping,
            })),
          }),
        );
      },
    });
  }

  private lagReport() {
    return defineTool({
      name: "get_lag_report",
      description:
        "Scan of a running server: entity counts by type, chunks with the most entities and tile entities, scheduled tasks per plugin. Use it to find what causes lag. Needs Kubek Companion",
      kind: "read",
      access: "serverView",
      serverScoped: true,
      args: serverArgs({
        limit: z.number().int().min(1).max(20).optional(),
      }),
      run: (_ctx, { serverId, limit }) =>
        this.call(serverId, async () =>
          json(await this.companion.lagReport(serverId, limit ?? 10)),
        ),
    });
  }

  private livePlugins() {
    return defineTool({
      name: "list_loaded_plugins",
      description:
        "Plugins as the running server loaded them, with versions and whether each one is enabled. A disabled one usually failed to start. Needs Kubek Companion",
      kind: "read",
      access: [AccessArea.CONTENT, "read"],
      serverScoped: true,
      args: serverArgs({}),
      run: (_ctx, { serverId }) =>
        this.call(serverId, async () =>
          json(await this.companion.livePlugins(serverId)),
        ),
    });
  }

  // Stored feed, readable while the plugin is offline too
  private playerActivity() {
    return defineTool({
      name: "get_player_activity",
      description:
        "Joins, quits, kicks, deaths and chat of one player, newest first, only the kinds enabled in the activity feed. Collected by Kubek Companion",
      kind: "read",
      access: [AccessArea.PLAYERS, "read"],
      serverScoped: true,
      args: serverArgs({
        uuid: z
          .string()
          .uuid()
          .describe("Player UUID, get_player or find_players give it"),
        types: z
          .array(z.enum(COMPANION_EVENT_TYPES))
          .optional()
          .describe("Only these kinds, all when omitted"),
        before: z
          .number()
          .int()
          .min(1)
          .optional()
          .describe("nextBefore of the previous page"),
        limit: z.number().int().min(1).max(100).optional(),
      }),
      run: async (_ctx, { serverId, uuid, types, before, limit }) => {
        if (!this.companion.supports(serverId)) return failure(UNSUPPORTED);
        return json(
          this.companion.eventsPage(serverId, {
            uuid,
            types,
            before,
            limit: limit ?? 50,
          }),
        );
      },
    });
  }

  private broadcast() {
    return defineTool({
      name: "broadcast_message",
      description:
        "Send a chat message to everyone on a running server, & color codes work. Needs Kubek Companion",
      kind: "write",
      access: [AccessArea.PLAYERS, "write"],
      serverScoped: true,
      args: serverArgs({ message: z.string().min(1).max(512) }),
      preview: (_ctx, { message }) =>
        Promise.resolve({
          type: "summary",
          title: "Message to everyone online",
          lines: [message],
        }),
      audit: () => ({
        action: AuditAction.COMPANION_BROADCAST,
        category: AuditCategory.SERVER,
      }),
      run: (ctx, { serverId, message }) =>
        this.call(serverId, async () => {
          await this.companion.broadcast(serverId, message, ctx.user);
          return text("Message sent");
        }),
    });
  }

  private async call(
    serverId: string,
    run: () => Promise<ToolResult>,
  ): Promise<ToolResult> {
    if (!this.companion.isConnected(serverId))
      return this.unavailable(serverId);
    try {
      return await run();
    } catch (e) {
      return failure(getErrorMessage(e));
    }
  }

  // An error, so a broadcast without the plugin isn't reported or logged as sent
  private unavailable(serverId: string): ToolResult {
    return failure(
      this.companion.supports(serverId) ? NOT_CONNECTED : UNSUPPORTED,
    );
  }
}
