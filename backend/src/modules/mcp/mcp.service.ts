import { AppEventsService } from "@/core/events/app-events.service";
import { ApiErrorCode } from "@/core/errors/error-codes";
import { extractClientIp } from "@/core/utils/request";
import { getVersion } from "@/core/utils/updates";
import { ToolRegistryService } from "@/modules/assistant/tools/tool-registry.service";
import {
  parseToolArgs,
  toToolSpec,
} from "@/modules/assistant/tools/tool-schema";
import type { AssistantTool } from "@/modules/assistant/tools/tool.types";
import { ConfigService } from "@/modules/config/config.service";
import {
  ForbiddenException,
  Injectable,
  type OnModuleDestroy,
  type OnModuleInit,
} from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
  CallToolRequestSchema,
  type CallToolResult,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import type { IUser } from "@shared/types/user.types";
import { randomUUID } from "crypto";
import type { Request, Response } from "express";

const SESSION_IDLE_MS = 60 * 60 * 1000;
const SESSIONS_PER_KEY = 20;

/** Who is calling right now, refreshed on every request of the session */
export interface McpCaller {
  user: IUser;
  ip: string | null;
  userAgent: string | null;
}

interface McpSession {
  keyId: string;
  server: Server;
  transport: StreamableHTTPServerTransport;
  caller: McpCaller;
  seenAt: number;
}

@Injectable()
export class McpService implements OnModuleInit, OnModuleDestroy {
  // Sessions keep the client name from initialize for the audit log
  private readonly sessions = new Map<string, McpSession>();

  constructor(
    private readonly tools: ToolRegistryService,
    private readonly config: ConfigService,
    private readonly events: AppEventsService,
  ) {}

  onModuleInit(): void {
    this.events.on("api_key.changed", ({ keyId }) => this.closeKey(keyId));
  }

  onModuleDestroy(): void {
    for (const id of [...this.sessions.keys()]) this.close(id);
  }

  isEnabled(): boolean {
    return this.config.get("mcp")?.enabled === true;
  }

  setEnabled(enabled: boolean): void {
    this.config.set("mcp", { enabled });
    if (!enabled) {
      for (const id of [...this.sessions.keys()]) this.close(id);
    }
  }

  /** Only keys with MCP on reach it, and only while it's on for the panel */
  assertAllowed(user: IUser): void {
    if (!this.isEnabled()) {
      throw new ForbiddenException({
        code: ApiErrorCode.MCP_DISABLED,
        message: "MCP is turned off in the panel",
      });
    }
    if (!user.apiKey?.mcp) {
      throw new ForbiddenException({
        code: ApiErrorCode.MCP_DISABLED,
        message: "MCP is not allowed for this key",
      });
    }
  }

  async handle(user: IUser, req: Request, res: Response): Promise<void> {
    this.assertAllowed(user);
    const keyId = user.apiKey!.id;
    const caller: McpCaller = {
      user,
      ip: extractClientIp(req),
      userAgent: req.headers["user-agent"] ?? null,
    };

    const sessionId = req.headers["mcp-session-id"];
    if (typeof sessionId === "string") {
      const session = this.sessions.get(sessionId);
      // A session never moves to another key
      if (!session || session.keyId !== keyId) {
        res.status(404).json({
          jsonrpc: "2.0",
          error: { code: -32001, message: "Session not found" },
          id: null,
        });
        return;
      }
      session.caller = caller;
      session.seenAt = Date.now();
      await session.transport.handleRequest(req, res, req.body);
      return;
    }

    // Without a session id only initialize goes through, the transport answers the rest
    const session = {
      keyId,
      caller,
      seenAt: Date.now(),
    } as McpSession;
    session.server = this.createServer(() => session.caller);
    session.transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      enableJsonResponse: true,
      onsessioninitialized: (id) => {
        this.sessions.set(id, session);
        this.trimKey(keyId);
      },
      onsessionclosed: (id) => this.close(id),
    });
    await session.server.connect(session.transport);
    await session.transport.handleRequest(req, res, req.body);
  }

  createServer(caller: () => McpCaller): Server {
    const server = new Server(
      { name: "kubek", version: getVersion() },
      {
        capabilities: { tools: {} },
        instructions:
          "Tools of a Kubek Minecraft server panel. Call list_servers first to get server ids",
      },
    );

    server.setRequestHandler(ListToolsRequestSchema, () => ({
      tools: this.available(caller().user).map(toMcpTool),
    }));

    server.setRequestHandler(CallToolRequestSchema, (request, extra) => {
      const client = server.getClientVersion();
      const current = caller();
      return this.call(
        {
          ...current,
          userAgent: client
            ? `${client.name}/${client.version}`
            : current.userAgent,
        },
        request.params.name,
        request.params.arguments,
        extra.signal,
      );
    });

    return server;
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  dropIdle(): void {
    const cutoff = Date.now() - SESSION_IDLE_MS;
    for (const [id, session] of this.sessions) {
      if (session.seenAt < cutoff) this.close(id);
    }
  }

  // Web search needs the assistant's provider, plans and questions need the panel chat
  private available(user: IUser): AssistantTool[] {
    return this.tools
      .available(user)
      .filter((tool) => !tool.feature && (tool.kind === "read" || tool.kind === "write"));
  }

  private async call(
    caller: McpCaller,
    name: string,
    args: Record<string, unknown> | undefined,
    signal: AbortSignal,
  ): Promise<CallToolResult> {
    const tool = this.available(caller.user).find((t) => t.name === name);
    if (!tool) return errorResult(`Unknown tool ${name}`);

    const parsed = parseToolArgs(tool, JSON.stringify(args ?? {}));
    if (!parsed.ok) return errorResult(parsed.error);

    const result = await this.tools.execute(
      {
        user: caller.user,
        origin: { mcp: true, ip: caller.ip, client: caller.userAgent },
        signal,
      },
      tool,
      parsed.args,
    );
    return {
      content: [{ type: "text", text: result.content }],
      isError: result.isError ?? false,
    };
  }

  // Oldest sessions of a key go first, a client that never closes can't pile them up
  private trimKey(keyId: string): void {
    const own = [...this.sessions]
      .filter(([, s]) => s.keyId === keyId)
      .sort(([, a], [, b]) => a.seenAt - b.seenAt);
    for (const [id] of own.slice(
      0,
      Math.max(0, own.length - SESSIONS_PER_KEY),
    )) {
      this.close(id);
    }
  }

  private closeKey(keyId: string): void {
    for (const [id, session] of this.sessions) {
      if (session.keyId === keyId) this.close(id);
    }
  }

  private close(id: string): void {
    const session = this.sessions.get(id);
    if (!session) return;
    this.sessions.delete(id);
    void session.transport.close();
    void session.server.close();
  }
}

function toMcpTool(tool: AssistantTool): Tool {
  const { parameters } = toToolSpec(tool).function;
  return {
    name: tool.name,
    description: tool.description,
    inputSchema: parameters as Tool["inputSchema"],
    annotations: {
      readOnlyHint: tool.kind === "read",
      destructiveHint: tool.kind === "write",
      openWorldHint: false,
    },
  };
}

const errorResult = (text: string): CallToolResult => ({
  content: [{ type: "text", text }],
  isError: true,
});
