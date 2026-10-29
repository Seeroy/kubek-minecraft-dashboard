import type { Database } from "bun:sqlite";

export interface Migration {
  version: number;
  name: string;
  // Tables to check for broken foreign keys after the step
  touches?: string[];
  up(db: Database, log: (message: string) => void): void;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function count(db: Database, table: string, where = ""): number {
  const row = db.query(`SELECT COUNT(*) AS c FROM ${table} ${where}`).get() as {
    c: number;
  };
  return Number(row.c);
}

export function columnsOf(db: Database, table: string): string[] {
  const rows = db.query(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  return rows.map((r) => r.name);
}

export function tableExists(db: Database, table: string): boolean {
  return !!db
    .query("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
}

// Recreates a table with a new definition, SQLite can't change constraints
// in place. Foreign keys must be off, otherwise DROP deletes child rows
export function rebuildTable(
  db: Database,
  table: string,
  opts: {
    define: (name: string) => string;
    columns: string;
    select: string;
    indexes?: string[];
  },
): void {
  const tmp = `${table}_new`;
  db.run(`DROP TABLE IF EXISTS ${tmp}`);
  db.run(opts.define(tmp));
  db.run(`INSERT INTO ${tmp} (${opts.columns}) ${opts.select}`);

  const before = count(db, table);
  const after = count(db, tmp);
  if (before !== after) {
    throw new Error(`${table}: copied ${after} of ${before} rows`);
  }

  db.run(`DROP TABLE ${table}`);
  db.run(`ALTER TABLE ${tmp} RENAME TO ${table}`);
  for (const index of opts.indexes ?? []) db.run(index);
}
