import type { IConfiguration } from "@/core/types/config";
import { Injectable } from "@nestjs/common";
import { SqliteProvider } from "../sqlite.provider";

// Top-level config keys with dedicated columns/serialization
const KNOWN_CONFIG_KEYS = new Set([
  "eulaAccepted",
  "authorization",
  "port",
  "configVersion",
  "ftpd",
  "subnetsAccessRestriction",
  "telegramBot",
]);

export abstract class IConfigRepository {
  abstract getAll(): IConfiguration;

  abstract get<K extends keyof IConfiguration>(key: K): IConfiguration[K];

  abstract set<K extends keyof IConfiguration>(
    key: K,
    value: IConfiguration[K],
  ): void;

  abstract updateAll(config: Partial<IConfiguration>): IConfiguration;
}

@Injectable()
export class ConfigRepository implements IConfigRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  getAll(): IConfiguration {
    const rows = this.sqlite.connection
      .query(`SELECT key, value FROM config_kv`)
      .all() as {
      key: string;
      value: string;
    }[];
    return this.deserializeKV(rows);
  }

  get<K extends keyof IConfiguration>(key: K): IConfiguration[K] {
    const all = this.getAll();
    return all[key];
  }

  set<K extends keyof IConfiguration>(key: K, value: IConfiguration[K]): void {
    const current = this.getAll();
    const next: any = { ...current, [key]: value };
    this.persist(next);
  }

  updateAll(config: Partial<IConfiguration>): IConfiguration {
    const current = this.getAll();
    const next: any = { ...current, ...config };
    this.persist(next);
    return next as IConfiguration;
  }

  private persist(cfg: IConfiguration) {
    const upsert = this.sqlite.connection.prepare(
      `INSERT INTO config_kv(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    );
    const pairs: [string, string][] = [
      ["eulaAccepted", String(cfg.eulaAccepted ? 1 : 0)],
      ["authorization", String(cfg.authorization ? 1 : 0)],
      ["port", String(cfg.port)],
      ["configVersion", String(cfg.configVersion)],
      ["ftpd", JSON.stringify(cfg.ftpd ?? { enabled: false })],
      [
        "subnetsAccessRestriction",
        JSON.stringify(cfg.subnetsAccessRestriction ?? { enabled: false }),
      ],
      ["telegramBot", JSON.stringify(cfg.telegramBot ?? { enabled: false })],
    ];
    const extras = this.pickExtras(cfg);
    for (const [k, v] of Object.entries(extras))
      pairs.push([k, JSON.stringify(v)]);
    const tx = this.sqlite.connection.transaction(
      (items: [string, string][]) => {
        for (const [k, v] of items) upsert.run(k, v);
      },
    );
    tx.immediate(pairs);
  }

  private deserializeKV(
    rows: { key: string; value: string }[],
  ): IConfiguration {
    const map = new Map(rows.map((r) => [r.key, r.value] as const));
    return {
      eulaAccepted: map.get("eulaAccepted") === "1",
      authorization: map.get("authorization") === "1",
      port: Number(map.get("port") ?? 8000),
      configVersion: Number(map.get("configVersion") ?? 1),
      ftpd: safeJSON(map.get("ftpd"), { enabled: false }),
      subnetsAccessRestriction: safeJSON(map.get("subnetsAccessRestriction"), {
        enabled: false,
      }),
      telegramBot: safeJSON(map.get("telegramBot"), { enabled: false }),
      ...this.pickExtrasFromKV(map),
    };
  }

  private pickExtras(cfg: IConfiguration): Record<string, unknown> {
    const extras: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(cfg)) {
      if (!KNOWN_CONFIG_KEYS.has(k)) extras[k] = v;
    }
    return extras;
  }

  private pickExtrasFromKV(map: Map<string, string>): Record<string, unknown> {
    const extras: Record<string, unknown> = {};
    for (const [k, v] of map.entries()) {
      if (!KNOWN_CONFIG_KEYS.has(k)) extras[k] = safeJSON(v, v);
    }
    return extras;
  }
}

function safeJSON<T>(input: unknown, fallback: T): T {
  try {
    if (typeof input === "string") return JSON.parse(input) as T;
    if (input == null) return fallback;
    return input as T;
  } catch {
    return fallback;
  }
}
