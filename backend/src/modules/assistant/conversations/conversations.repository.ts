import { SqliteProvider } from "@/modules/database/sqlite.provider";
import { Injectable } from "@nestjs/common";
import type { IAssistantConversation } from "@shared/types/assistant.types";
import { randomUUID } from "crypto";

export abstract class IConversationsRepository {
  abstract listByUser(userId: string): IAssistantConversation[];
  abstract find(userId: string, id: string): IAssistantConversation | null;
  abstract create(
    userId: string,
    title: string,
    serverId: string | null,
  ): IAssistantConversation;
  abstract touch(id: string, serverId: string | null): void;
  abstract delete(userId: string, id: string): boolean;
  abstract pruneBeyond(userId: string, keep: number): number;
}

@Injectable()
export class ConversationsRepository implements IConversationsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  listByUser(userId: string): IAssistantConversation[] {
    return this.sqlite.connection
      .query(
        "SELECT * FROM assistant_conversations WHERE userId = ? ORDER BY updatedAt DESC, id DESC",
      )
      .all(userId)
      .map((row) => this.deserialize(row));
  }

  find(userId: string, id: string): IAssistantConversation | null {
    const row = this.sqlite.connection
      .query(
        "SELECT * FROM assistant_conversations WHERE userId = ? AND id = ?",
      )
      .get(userId, id);
    return row ? this.deserialize(row) : null;
  }

  create(
    userId: string,
    title: string,
    serverId: string | null,
  ): IAssistantConversation {
    const now = Date.now();
    const conversation = {
      id: randomUUID(),
      title,
      serverId,
      createdAt: now,
      updatedAt: now,
    };
    this.sqlite.connection
      .prepare(
        `INSERT INTO assistant_conversations (id, userId, title, serverId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(conversation.id, userId, title, serverId, now, now);
    return conversation;
  }

  touch(id: string, serverId: string | null): void {
    this.sqlite.connection
      .prepare(
        "UPDATE assistant_conversations SET updatedAt = ?, serverId = COALESCE(?, serverId) WHERE id = ?",
      )
      .run(Date.now(), serverId, id);
  }

  delete(userId: string, id: string): boolean {
    return (
      this.sqlite.connection
        .prepare(
          "DELETE FROM assistant_conversations WHERE userId = ? AND id = ?",
        )
        .run(userId, id).changes > 0
    );
  }

  /** Drops the oldest conversations of a user above the cap */
  pruneBeyond(userId: string, keep: number): number {
    return this.sqlite.connection
      .prepare(
        `DELETE FROM assistant_conversations WHERE id IN (
          SELECT id FROM assistant_conversations WHERE userId = ?
          ORDER BY updatedAt DESC, id DESC LIMIT -1 OFFSET ?
        )`,
      )
      .run(userId, keep).changes;
  }

  private deserialize(row: any): IAssistantConversation {
    return {
      id: String(row.id),
      title: String(row.title),
      serverId: row.serverId ?? null,
      createdAt: Number(row.createdAt),
      updatedAt: Number(row.updatedAt),
    };
  }
}
