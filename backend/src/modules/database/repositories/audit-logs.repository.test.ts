import { beforeEach, describe, expect, test } from "bun:test";
import { AuditCategory, AuditResult } from "@shared/types/audit.types";
import { sqliteProvider } from "@/testing/sqlite";
import { AuditLogsRepository } from "./audit-logs.repository";

let repo: AuditLogsRepository;

const add = (id: string, createdAt: number, extra: object = {}) =>
  repo.create({
    id,
    userId: null,
    username: "kubek",
    action: "server.start",
    category: AuditCategory.SERVER,
    result: AuditResult.SUCCESS,
    source: "panel",
    createdAt,
    ...extra,
  });

beforeEach(() => {
  repo = new AuditLogsRepository(sqliteProvider());
});

describe("AuditLogsRepository rotation", () => {
  test("removes entries older than the cutoff", () => {
    add("a", 100);
    add("b", 200);
    add("c", 300);
    expect(repo.countPrunable({ before: 250 })).toBe(2);
    expect(repo.prune({ before: 250 })).toBe(2);
    expect(repo.stats()).toEqual({ total: 1, oldestAt: 300 });
  });

  test("keeps only the newest entries", () => {
    for (let i = 1; i <= 5; i++) add(`e${i}`, i * 10);
    expect(repo.prune({ keep: 2 })).toBe(3);
    expect(repo.query({}).items.map((e) => e.id)).toEqual(["e5", "e4"]);
  });

  test("either limit is enough to go", () => {
    for (let i = 1; i <= 4; i++) add(`e${i}`, i * 10);
    expect(repo.countPrunable({ before: 15, keep: 2 })).toBe(2);
    expect(repo.prune({})).toBe(0);
  });

  test("filters and stores the server of an entry", () => {
    add("a", 1, { serverId: "s1", serverName: "Survival" });
    add("b", 2, { serverId: "s2", serverName: "Lobby" });
    const page = repo.query({ serverId: "s1" });
    expect(page.items.map((e) => e.serverName)).toEqual(["Survival"]);
    expect(repo.query({ search: "Lob" }).items.map((e) => e.id)).toEqual(["b"]);
  });
});
