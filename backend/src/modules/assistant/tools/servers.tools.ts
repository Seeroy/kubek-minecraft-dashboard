import { ProcessStatsService } from "@/modules/metrics-history/services/process-stats.service";
import { ServersService } from "@/modules/servers/servers.service";
import { Injectable } from "@nestjs/common";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import { AccessArea } from "@shared/access/areas";
import { canSeeServer } from "@shared/access/can";
import { z } from "zod";
import { failure, json, serverArgs, text } from "./tool-args";
import { type AssistantTool, type ToolGroup, defineTool } from "./tool.types";

const POWER_AUDIT = {
  start: AuditAction.SERVER_START,
  stop: AuditAction.SERVER_STOP,
  restart: AuditAction.SERVER_RESTART,
} as const;

@Injectable()
export class ServersTools implements ToolGroup {
  constructor(
    private readonly servers: ServersService,
    private readonly stats: ProcessStatsService,
  ) {}

  tools(): AssistantTool[] {
    return [
      this.listServers(),
      this.getServer(),
      this.getMetrics(),
      this.power(),
    ];
  }

  private listServers() {
    return defineTool({
      name: "list_servers",
      description:
        "List the Minecraft servers the user can see with their status",
      kind: "read",
      access: "serverView",
      serverScoped: false,
      args: z.object({}),
      run: (ctx) =>
        Promise.resolve(
          json(
            this.servers
              .findAll()
              .filter((s) => canSeeServer(ctx.user, s.id))
              .map((s) => ({
                id: s.id,
                name: s.name,
                status: s.status,
                type: s.blueprintId,
              })),
          ),
        ),
    });
  }

  private getServer() {
    return defineTool({
      name: "get_server",
      description:
        "Details of one server: status, type, launch variables, runtime and auto restart",
      kind: "read",
      access: "serverView",
      serverScoped: true,
      args: serverArgs({}),
      run: (_ctx, { serverId }) => {
        const server = this.servers.findById(serverId)!;
        return Promise.resolve(
          json({
            id: server.id,
            name: server.name,
            status: server.status,
            type: server.blueprintId,
            typeVersion: server.blueprintVersion ?? null,
            runtime: server.runtimeKind ?? "native",
            variables: server.variables,
            restartOnError: server.restartOnError,
          }),
        );
      },
    });
  }

  private getMetrics() {
    return defineTool({
      name: "get_metrics",
      description: "Live CPU and memory usage of a running server",
      kind: "read",
      access: "serverView",
      serverScoped: true,
      args: serverArgs({}),
      run: async (_ctx, { serverId }) => {
        if (!this.stats.isEnabled()) {
          return failure("Process statistics are turned off in panel settings");
        }
        const stats = (await this.stats.collect()).find(
          (s) => s.serverId === serverId,
        );
        if (!stats) return text("The server is not running");
        return json({
          cpuPercentOfHost: stats.cpu,
          memoryMb: Math.round(stats.memoryBytes / 1024 / 1024),
          memoryLimitMb: stats.memoryLimitBytes
            ? Math.round(stats.memoryLimitBytes / 1024 / 1024)
            : null,
          startedAt: stats.startedAt,
        });
      },
    });
  }

  private power() {
    return defineTool({
      name: "power",
      description: "Start, stop or restart a server",
      kind: "write",
      access: [AccessArea.POWER, "write"],
      serverScoped: true,
      args: serverArgs({ action: z.enum(["start", "stop", "restart"]) }),
      preview: (_ctx, { serverId, action }) =>
        Promise.resolve({
          type: "summary",
          title: `${action} ${this.servers.findById(serverId)?.name ?? serverId}`,
          lines: [],
        }),
      run: async ({ user }, { serverId, action }) => {
        if (action === "start") await this.servers.start(serverId, user.id);
        else if (action === "stop") await this.servers.stop(serverId, user);
        else await this.servers.restart(serverId, user);
        return text(`Requested ${action}, the status updates as it goes`);
      },
      audit: ({ action }) => ({
        action: POWER_AUDIT[action],
        category: AuditCategory.SERVER,
      }),
    });
  }
}
