import { Injectable } from "@nestjs/common";
import type {
  CompanionEvent,
  CompanionEventType,
} from "@shared/types/companion.types";
import { SqliteProvider } from "../sqlite.provider";

// Stored rows get their own numeric id, the plugin's id is for countdowns only
export interface StoredCompanionEvent extends Omit<CompanionEvent, "id"> {
  id: number;
}

export interface CompanionEventsQuery {
  types?: CompanionEventType[];
  /** Only events older than this id, for paging */
  before?: number;
  /** Substring of the name, uuid, chat message or kick reason */
  q?: string;
  uuid?: string;
  limit: number;
}

export interface PlaytimeRow {
  uuid: string;
  name: string;
  playtimeMs: number;
  sessions: number;
  lastSeen: number;
}

// Fields that already have their own columns
const COLUMNS = new Set(["type", "ts", "uuid", "name"]);

/** Activity feed of a server: joins, quits, deaths, chat and so on */
@Injectable()
export class CompanionEventsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  insertMany(serverId: string, events: CompanionEvent[]): void {
    if (events.length === 0) return;
    const stmt = this.sqlite.connection.prepare(
      `INSERT INTO companion_events (serverId, ts, type, uuid, name, data)
       SELECT ?1, ?2, ?3, ?4, ?5, ?6 WHERE EXISTS (SELECT 1 FROM servers WHERE id = ?1)`,
    );
    const tx = this.sqlite.connection.transaction((rows: CompanionEvent[]) => {
      for (const e of rows) {
        const extra = Object.fromEntries(
          Object.entries(e).filter(([k, v]) => !COLUMNS.has(k) && v != null),
        );
        stmt.run(
          serverId,
          e.ts,
          e.type,
          e.uuid ?? null,
          e.name ?? null,
          Object.keys(extra).length ? JSON.stringify(extra) : null,
        );
      }
    });
    tx(events);
  }

  list(serverId: string, query: CompanionEventsQuery): StoredCompanionEvent[] {
    const where = ["serverId = ?"];
    const params: (string | number)[] = [serverId];
    if (query.types?.length) {
      where.push(`type IN (${query.types.map(() => "?").join(", ")})`);
      params.push(...query.types);
    }
    if (query.before) {
      where.push("id < ?");
      params.push(query.before);
    }
    if (query.uuid) {
      where.push("uuid = ?");
      params.push(query.uuid.toLowerCase());
    }
    const q = query.q?.trim();
    if (q) {
      // SQLite LIKE ignores case only for ASCII
      const fields = [
        "name",
        "uuid",
        "json_extract(data, '$.message')",
        "json_extract(data, '$.reason')",
      ];
      where.push(
        `(${fields.map((f) => `${f} LIKE ? ESCAPE '\\'`).join(" OR ")})`,
      );
      const pattern = `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
      params.push(...fields.map(() => pattern));
    }
    const rows = this.sqlite.connection
      .query(
        `SELECT id, ts, type, uuid, name, data FROM companion_events
          WHERE ${where.join(" AND ")} ORDER BY id DESC LIMIT ?`,
      )
      .all(...params, query.limit) as {
      id: number;
      ts: number;
      type: CompanionEventType;
      uuid: string | null;
      name: string | null;
      data: string | null;
    }[];
    return rows.map((r) => ({
      ...parseData(r.data),
      id: Number(r.id),
      ts: Number(r.ts),
      type: r.type,
      uuid: r.uuid ?? undefined,
      name: r.name ?? undefined,
    }));
  }

  /** Time played per player, summed from finished sessions */
  playtime(serverId: string, fromTs: number, limit: number): PlaytimeRow[] {
    const rows = this.sqlite.connection
      .query(
        `SELECT uuid, MAX(name) AS name,
                SUM(COALESCE(json_extract(data, '$.session'), 0)) AS playtimeMs,
                COUNT(*) AS sessions, MAX(ts) AS lastSeen
           FROM companion_events
          WHERE serverId = ? AND type = 'quit' AND ts >= ? AND uuid IS NOT NULL
          GROUP BY uuid ORDER BY playtimeMs DESC LIMIT ?`,
      )
      .all(serverId, fromTs, limit) as Record<string, unknown>[];
    return rows.map((r) => ({
      uuid: String(r.uuid),
      name: typeof r.name === "string" ? r.name : "",
      playtimeMs: Number(r.playtimeMs),
      sessions: Number(r.sessions),
      lastSeen: Number(r.lastSeen),
    }));
  }

  /** Age and size limits per server, returns removed rows */
  prune(olderThan: number, keepPerServer: number): number {
    const db = this.sqlite.connection;
    const byAge = db
      .prepare("DELETE FROM companion_events WHERE ts < ?")
      .run(olderThan).changes;
    const bySize = db
      .prepare(
        `DELETE FROM companion_events WHERE id IN (
           SELECT id FROM (
             SELECT id, ROW_NUMBER() OVER (PARTITION BY serverId ORDER BY id DESC) AS n
               FROM companion_events
           ) WHERE n > ?
         )`,
      )
      .run(keepPerServer).changes;
    return (byAge ?? 0) + (bySize ?? 0);
  }
}

function parseData(raw: string | null): Partial<CompanionEvent> {
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Partial<CompanionEvent>;
  } catch {
    return {};
  }
}
