import type { AuditCategory } from "@shared/types/audit.types";
import type {
  AssistantToolKind,
  AssistantToolPreview,
} from "@shared/types/assistant.types";
import type { AccessArea, AccessLevel } from "@shared/access/areas";
import type { IUser } from "@shared/types/user.types";
import type { z } from "zod";

/** Who calls a tool and from where, independent of the transport */
export interface ToolContext {
  user: IUser;
  /** Where the call came from, recorded in the audit log */
  origin: { conversationId?: string };
  signal?: AbortSignal;
}

export interface ToolResult {
  /** Text handed back to the model */
  content: string;
  isError?: boolean;
}

export interface ToolAudit {
  action: string;
  category: AuditCategory;
  resourceName?: string;
}

/** Level in an area, or "serverView" for read in any server area */
export type ToolAccess = readonly [AccessArea, AccessLevel] | "serverView";

export interface AssistantTool<A = any> {
  name: string;
  description: string;
  args: z.ZodType<A>;
  kind: AssistantToolKind;
  access: ToolAccess;
  /** Args carry a serverId the caller must have access to */
  serverScoped: boolean;
  run(ctx: ToolContext, args: A): Promise<ToolResult>;
  preview?(ctx: ToolContext, args: A): Promise<AssistantToolPreview>;
  /** Audit entry for a write call, a generic one is used when missing */
  audit?(args: A): ToolAudit;
}

/** A domain group of tools, registered by the registry on startup */
export interface ToolGroup {
  tools(): AssistantTool[];
}

export const defineTool = <A>(tool: AssistantTool<A>): AssistantTool<A> => tool;
