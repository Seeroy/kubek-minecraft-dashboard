import { getErrorMessage } from "@/core/utils/error";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { ServersService } from "@/modules/servers/servers.service";
import { Inject, Injectable, OnModuleInit } from "@nestjs/common";
import type { AssistantToolPreview } from "@shared/types/assistant.types";
import {
  AuditAction,
  AuditCategory,
  AuditResult,
} from "@shared/types/audit.types";
import type { IUser } from "@shared/types/user.types";
import type { ChatToolSpec } from "../llm/llm.types";
import { redactSecrets, truncateOutput } from "../runner/redact";
import { denyReason, hasToolAccess, serverIdOf } from "./tool-access";
import { toToolSpec } from "./tool-schema";
import type {
  AssistantTool,
  ToolContext,
  ToolGroup,
  ToolResult,
} from "./tool.types";

export const TOOL_GROUPS = Symbol("TOOL_GROUPS");

const OUTPUT_LIMIT = 12_000;

/** Every assistant tool, filtered per caller. Knows nothing about chats */
@Injectable()
export class ToolRegistryService implements OnModuleInit {
  private readonly tools = new Map<string, AssistantTool>();

  constructor(
    @Inject(TOOL_GROUPS) private readonly groups: ToolGroup[],
    private readonly servers: ServersService,
    private readonly audit: AuditLogService,
  ) {}

  onModuleInit(): void {
    for (const group of this.groups) {
      for (const tool of group.tools()) {
        if (this.tools.has(tool.name)) {
          throw new Error(`Assistant tool ${tool.name} is declared twice`);
        }
        this.tools.set(tool.name, tool);
      }
    }
  }

  get(name: string): AssistantTool | undefined {
    return this.tools.get(name);
  }

  available(user: IUser): AssistantTool[] {
    return [...this.tools.values()].filter((tool) => hasToolAccess(user, tool));
  }

  specs(user: IUser): ChatToolSpec[] {
    return this.available(user).map(toToolSpec);
  }

  denyReason(user: IUser, tool: AssistantTool, args: unknown): string | null {
    return denyReason(user, tool, args, (id) => !!this.servers.findById(id));
  }

  async preview(
    ctx: ToolContext,
    tool: AssistantTool,
    args: unknown,
  ): Promise<AssistantToolPreview> {
    if (tool.preview) return tool.preview(ctx, args);
    return {
      type: "summary",
      title: tool.description,
      lines: Object.entries(args ?? {}).map(
        ([key, value]) => `${key}: ${JSON.stringify(value)}`,
      ),
    };
  }

  /** Checks access again, runs the tool and cleans its output for the model */
  async execute(
    ctx: ToolContext,
    tool: AssistantTool,
    args: unknown,
  ): Promise<ToolResult> {
    const denied = this.denyReason(ctx.user, tool, args);
    if (denied) return { content: denied, isError: true };

    let result: ToolResult;
    try {
      result = await tool.run(ctx, args);
    } catch (err) {
      result = { content: getErrorMessage(err), isError: true };
    }
    if (tool.kind === "write") this.record(ctx, tool, args, result);
    return {
      ...result,
      content: truncateOutput(redactSecrets(result.content), OUTPUT_LIMIT),
    };
  }

  private record(
    ctx: ToolContext,
    tool: AssistantTool,
    args: unknown,
    result: ToolResult,
  ): void {
    const audit = tool.audit?.(args) ?? {
      action: AuditAction.ASSISTANT_TOOL,
      category: AuditCategory.SERVER,
    };
    const serverId = serverIdOf(args);
    this.audit.record({
      action: audit.action,
      category: audit.category,
      userId: ctx.user.id,
      username: ctx.user.username,
      resourceType: serverId ? "server" : "assistant",
      resourceId: serverId,
      resourceName:
        audit.resourceName ??
        (serverId ? this.servers.findById(serverId)?.name : null) ??
        null,
      serverId,
      details: {
        tool: tool.name,
        conversationId: ctx.origin.conversationId,
        args: summarizeArgs(args),
      },
      result: result.isError ? AuditResult.FAILED : AuditResult.SUCCESS,
      error: result.isError ? result.content.slice(0, 500) : null,
      source: "assistant",
    });
  }
}

// File contents and other long values stay out of the audit log
function summarizeArgs(args: unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args ?? {})) {
    const text = redactSecrets(
      typeof value === "string" ? value : JSON.stringify(value ?? null),
    );
    out[key] =
      text.length > 200
        ? `${text.slice(0, 200)}... (${text.length} chars)`
        : text;
  }
  return out;
}
