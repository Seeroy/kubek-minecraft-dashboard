import { SqliteProvider } from "@/modules/database/sqlite.provider";
import { Injectable } from "@nestjs/common";
import type {
  AssistantAttachmentKind,
  AssistantMessageRole,
  AssistantSource,
  AssistantUsage,
  AssistantToolCallStatus,
  AssistantToolPreview,
} from "@shared/types/assistant.types";
import type { ReasoningReplay } from "../llm/llm.types";

export interface StoredAttachment {
  id: string;
  kind: AssistantAttachmentKind;
  name: string;
  mime: string;
  data: Buffer;
}

export interface StoredToolCall {
  id: string;
  messageId: string;
  name: string;
  args: Record<string, unknown>;
  status: AssistantToolCallStatus;
  result: string | null;
  preview: AssistantToolPreview | null;
}

export interface StoredMessage {
  id: string;
  conversationId: string;
  role: AssistantMessageRole;
  content: string;
  error: string | null;
  createdAt: number;
  toolCalls: StoredToolCall[];
  usage?: AssistantUsage | null;
  attachments?: StoredAttachment[];
  reasoning?: string | null;
  reasoningMs?: number | null;
  /** Provider reasoning fields sent back with this message on later requests */
  replay?: ReasoningReplay | null;
  sources?: AssistantSource[];
}

export type ToolCallPatch = Partial<
  Pick<StoredToolCall, "status" | "result" | "preview">
>;

export abstract class IMessagesRepository {
  abstract list(conversationId: string): StoredMessage[];
  abstract insert(message: StoredMessage): void;
  abstract findToolCall(
    conversationId: string,
    callId: string,
  ): StoredToolCall | null;
  abstract updateToolCall(id: string, patch: ToolCallPatch): void;
  abstract findAttachment(
    conversationId: string,
    id: string,
  ): StoredAttachment | null;
}

const parseJson = <T>(value: unknown, fallback: T): T => {
  if (typeof value !== "string" || !value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
};

@Injectable()
export class MessagesRepository implements IMessagesRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  list(conversationId: string): StoredMessage[] {
    const db = this.sqlite.connection;
    const messages = db
      .query(
        "SELECT * FROM assistant_messages WHERE conversationId = ? ORDER BY seq",
      )
      .all(conversationId);
    const calls = db
      .query(
        `SELECT c.* FROM assistant_tool_calls c
        JOIN assistant_messages m ON m.id = c.messageId
        WHERE m.conversationId = ? ORDER BY m.seq, c.position`,
      )
      .all(conversationId)
      .map((row) => this.deserializeCall(row));
    const attachments = db
      .query(
        `SELECT a.* FROM assistant_attachments a
        JOIN assistant_messages m ON m.id = a.messageId
        WHERE m.conversationId = ? ORDER BY m.seq, a.position`,
      )
      .all(conversationId) as any[];
    return messages.map((row: any) => ({
      id: String(row.id),
      conversationId: String(row.conversationId),
      role: row.role as AssistantMessageRole,
      content: String(row.content ?? ""),
      error: row.error ?? null,
      createdAt: Number(row.createdAt),
      toolCalls: calls.filter((call) => call.messageId === row.id),
      usage:
        row.promptTokens == null
          ? null
          : {
              promptTokens: Number(row.promptTokens),
              completionTokens: Number(row.completionTokens ?? 0),
              cachedTokens: Number(row.cachedTokens ?? 0),
              costUsd: row.costUsd == null ? null : Number(row.costUsd),
            },
      attachments: attachments
        .filter((item) => item.messageId === row.id)
        .map((item) => this.deserializeAttachment(item)),
      reasoning: row.reasoning ?? null,
      reasoningMs: row.reasoningMs == null ? null : Number(row.reasoningMs),
      replay: parseJson<ReasoningReplay | null>(row.replay, null),
      sources: parseJson(row.sources, []),
    }));
  }

  insert(message: StoredMessage): void {
    const db = this.sqlite.connection;
    db.transaction(() => {
      db.prepare(
        `INSERT INTO assistant_messages (id, conversationId, seq, role, content, error, createdAt, promptTokens, completionTokens, cachedTokens, costUsd, reasoning, reasoningMs, replay, sources)
        VALUES (?, ?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM assistant_messages WHERE conversationId = ?), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        message.id,
        message.conversationId,
        message.conversationId,
        message.role,
        message.content,
        message.error,
        message.createdAt,
        message.usage?.promptTokens ?? null,
        message.usage?.completionTokens ?? null,
        message.usage?.cachedTokens ?? null,
        message.usage?.costUsd ?? null,
        message.reasoning || null,
        message.reasoningMs ?? null,
        message.replay ? JSON.stringify(message.replay) : null,
        message.sources?.length ? JSON.stringify(message.sources) : null,
      );
      const insertAttachment = db.prepare(
        `INSERT INTO assistant_attachments (id, messageId, position, kind, name, mime, data)
        VALUES (?, ?, ?, ?, ?, ?, ?)`,
      );
      (message.attachments ?? []).forEach((file, position) =>
        insertAttachment.run(
          file.id,
          message.id,
          position,
          file.kind,
          file.name,
          file.mime,
          file.data,
        ),
      );
      const insertCall = db.prepare(
        `INSERT INTO assistant_tool_calls (id, messageId, position, name, args, status, result, preview)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      );
      message.toolCalls.forEach((call, position) =>
        insertCall.run(
          call.id,
          message.id,
          position,
          call.name,
          JSON.stringify(call.args),
          call.status,
          call.result,
          call.preview ? JSON.stringify(call.preview) : null,
        ),
      );
    })();
  }

  findToolCall(conversationId: string, callId: string): StoredToolCall | null {
    const row = this.sqlite.connection
      .query(
        `SELECT c.* FROM assistant_tool_calls c
        JOIN assistant_messages m ON m.id = c.messageId
        WHERE m.conversationId = ? AND c.id = ?`,
      )
      .get(conversationId, callId);
    return row ? this.deserializeCall(row) : null;
  }

  findAttachment(conversationId: string, id: string): StoredAttachment | null {
    const row = this.sqlite.connection
      .query(
        `SELECT a.* FROM assistant_attachments a
        JOIN assistant_messages m ON m.id = a.messageId
        WHERE m.conversationId = ? AND a.id = ?`,
      )
      .get(conversationId, id);
    return row ? this.deserializeAttachment(row) : null;
  }

  updateToolCall(id: string, patch: ToolCallPatch): void {
    const sets: string[] = [];
    const values: (string | null)[] = [];
    if (patch.status !== undefined) {
      sets.push("status = ?");
      values.push(patch.status);
    }
    if (patch.result !== undefined) {
      sets.push("result = ?");
      values.push(patch.result);
    }
    if (patch.preview !== undefined) {
      sets.push("preview = ?");
      values.push(patch.preview ? JSON.stringify(patch.preview) : null);
    }
    if (!sets.length) return;
    this.sqlite.connection
      .prepare(
        `UPDATE assistant_tool_calls SET ${sets.join(", ")} WHERE id = ?`,
      )
      .run(...values, id);
  }

  private deserializeAttachment(row: any): StoredAttachment {
    return {
      id: String(row.id),
      kind: row.kind as AssistantAttachmentKind,
      name: String(row.name),
      mime: String(row.mime),
      data: Buffer.from(row.data as Uint8Array),
    };
  }

  private deserializeCall(row: any): StoredToolCall {
    return {
      id: String(row.id),
      messageId: String(row.messageId),
      name: String(row.name),
      args: JSON.parse(String(row.args || "{}")),
      status: row.status as AssistantToolCallStatus,
      result: row.result ?? null,
      preview: row.preview ? JSON.parse(String(row.preview)) : null,
    };
  }
}
