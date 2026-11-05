import { Injectable } from "@nestjs/common";
import type { CompanionMaintenance } from "@shared/types/companion.types";
import { SqliteProvider } from "../sqlite.provider";

/** What the activity feed keeps, chat is off until someone opts in */
export interface CompanionFeedSettings {
  sessions: boolean;
  kicks: boolean;
  deaths: boolean;
  chat: boolean;
}

export interface CompanionSettingsRow extends CompanionFeedSettings {
  coords: boolean;
  maintenance: CompanionMaintenance | null;
}

const DEFAULTS: CompanionSettingsRow = {
  sessions: true,
  kicks: true,
  deaths: true,
  chat: false,
  coords: false,
  maintenance: null,
};

const FLAGS = ["sessions", "kicks", "deaths", "chat", "coords"] as const;

type Row = Record<(typeof FLAGS)[number], number> & {
  maintenance: string | null;
};

/** Per-server companion settings, pushed to the plugin after every hello */
@Injectable()
export class CompanionSettingsRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  get(serverId: string): CompanionSettingsRow {
    const row = this.sqlite.connection
      .query(
        `SELECT ${FLAGS.join(", ")}, maintenance FROM companion_settings WHERE serverId = ?`,
      )
      .get(serverId) as Row | null;
    if (!row) return { ...DEFAULTS };
    return {
      sessions: !!row.sessions,
      kicks: !!row.kicks,
      deaths: !!row.deaths,
      chat: !!row.chat,
      coords: !!row.coords,
      maintenance: parseMaintenance(row.maintenance),
    };
  }

  update(
    serverId: string,
    patch: Partial<CompanionSettingsRow>,
  ): CompanionSettingsRow {
    const next = { ...this.get(serverId), ...patch };
    // The server could be gone already, then there is nothing to keep
    this.sqlite.connection
      .prepare(
        `INSERT INTO companion_settings (serverId, ${FLAGS.join(", ")}, maintenance)
         SELECT ?1, ?2, ?3, ?4, ?5, ?6, ?7 WHERE EXISTS (SELECT 1 FROM servers WHERE id = ?1)
         ON CONFLICT(serverId) DO UPDATE SET
           sessions = excluded.sessions, kicks = excluded.kicks, deaths = excluded.deaths,
           chat = excluded.chat, coords = excluded.coords, maintenance = excluded.maintenance`,
      )
      .run(
        serverId,
        ...FLAGS.map((flag) => (next[flag] ? 1 : 0)),
        next.maintenance ? JSON.stringify(next.maintenance) : null,
      );
    return next;
  }
}

function parseMaintenance(raw: string | null): CompanionMaintenance | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as CompanionMaintenance;
  } catch {
    return null;
  }
}
