import { getErrorMessage } from "@/core/utils/error";
import { ServerLogsService } from "@/modules/server-logs/server-logs.service";
import { ServersService } from "@/modules/servers/servers.service";
import { Injectable } from "@nestjs/common";
import { AuditAction, AuditCategory } from "@shared/types/audit.types";
import { AccessArea } from "@shared/access/areas";
import { z } from "zod";
import { failure, json, serverArgs, text } from "./tool-args";
import { type AssistantTool, type ToolGroup, defineTool } from "./tool.types";

const LATEST = "latest.log";
const ERROR_LINE = /\b(ERROR|FATAL|SEVERE)\b|Exception|Caused by:|^\s+at /;
// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]/g;

@Injectable()
export class ConsoleTools implements ToolGroup {
  constructor(
    private readonly servers: ServersService,
    private readonly logs: ServerLogsService,
  ) {}

  tools(): AssistantTool[] {
    return [
      this.readConsole(),
      this.searchLogs(),
      this.getDiagnostics(),
      this.sendCommand(),
    ];
  }

  private readConsole() {
    return defineTool({
      name: "read_console",
      description: "Last lines of the server console (logs/latest.log)",
      kind: "read",
      access: [AccessArea.CONSOLE, "read"],
      serverScoped: true,
      args: serverArgs({
        lines: z.number().int().min(1).max(400).default(80),
      }),
      run: async (_ctx, { serverId, lines }) => {
        const tail = await this.tail(serverId, lines);
        return text(tail || "The console is empty");
      },
    });
  }

  private searchLogs() {
    return defineTool({
      name: "search_logs",
      description:
        "Case insensitive search in a log file of the server, latest.log by default",
      kind: "read",
      access: [AccessArea.FILES, "read"],
      serverScoped: true,
      args: serverArgs({
        query: z.string().min(2).max(200),
        file: z
          .string()
          .max(128)
          .default(LATEST)
          .describe("File name inside logs/, like 2026-10-01-1.log.gz"),
      }),
      run: async (_ctx, { serverId, query, file }) => {
        try {
          const matches = await this.logs.search(serverId, file, query);
          if (!matches.length) return text("No matches");
          return json(matches.slice(0, 60));
        } catch (err) {
          const files = await this.logs.listFiles(serverId);
          return failure(
            `${getErrorMessage(err)}. Log files: ${files.map((f) => f.name).join(", ") || "none"}`,
          );
        }
      },
    });
  }

  private getDiagnostics() {
    return defineTool({
      name: "get_diagnostics",
      description:
        "Problems the panel recognized on the server plus recent error lines of its console",
      kind: "read",
      access: "serverView",
      serverScoped: true,
      args: serverArgs({}),
      run: async (_ctx, { serverId }) => {
        const diagnostics = this.servers.getDiagnostics(serverId);
        const tail = await this.tail(serverId, 1500);
        const errors = tail
          .split("\n")
          .filter((line) => ERROR_LINE.test(line))
          .slice(-60);
        return json({ diagnostics, recentErrorLines: errors });
      },
    });
  }

  private sendCommand() {
    return defineTool({
      name: "send_command",
      description:
        "Run a console command on a running server, without the leading slash",
      kind: "write",
      access: [AccessArea.CONSOLE, "write"],
      serverScoped: true,
      args: serverArgs({
        command: z
          .string()
          .min(1)
          .max(1000)
          .regex(/^[^\r\n]+$/, "One line only"),
      }),
      preview: (_ctx, { command }) =>
        Promise.resolve({ type: "command", command: clean(command) }),
      run: ({ user }, { serverId, command }) => {
        const sent = this.servers
          .getInstance(serverId)
          .input(clean(command), user);
        return Promise.resolve(
          sent
            ? text("Sent, call read_console to see the response")
            : failure("The server is not running"),
        );
      },
      audit: () => ({
        action: AuditAction.SERVER_COMMAND,
        category: AuditCategory.SERVER,
      }),
    });
  }

  // Falls back to the in-memory console when there is no log file yet
  private async tail(serverId: string, lines: number): Promise<string> {
    try {
      return (
        await this.logs.readContent(serverId, LATEST, { tail: lines })
      ).replace(ANSI, "");
    } catch {
      return this.servers
        .getInstance(serverId)
        .getLog()
        .slice(-lines)
        .map((entry) => entry.line ?? "")
        .filter(Boolean)
        .join("\n")
        .replace(ANSI, "");
    }
  }
}

const clean = (command: string) => command.trim().replace(/^\//, "");
