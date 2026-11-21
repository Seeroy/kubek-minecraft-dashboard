import { beforeEach, describe, expect, test } from "bun:test";
import type { CompanionEvent } from "@shared/types/companion.types";
import { sqliteProvider } from "@/testing/sqlite";
import { CompanionEventsRepository } from "./companion-events.repository";

let repo: CompanionEventsRepository;

beforeEach(() => {
  const sqlite = sqliteProvider();
  sqlite.connection.run(
    "INSERT INTO servers (id, name, status, restartEnabled, restartAttempts, blueprintId) VALUES ('s1', 'S', 'stopped', 0, 0, 'paper')",
  );
  repo = new CompanionEventsRepository(sqlite);
  const events: CompanionEvent[] = [
    { id: "1", type: "join", ts: 1, uuid: "aaaa-1111", name: "Steve" },
    {
      id: "2",
      type: "chat",
      ts: 2,
      uuid: "bbbb-2222",
      name: "Alex",
      message: "hello 100% world",
    },
    {
      id: "3",
      type: "kick",
      ts: 3,
      uuid: "cccc-3333",
      name: "Notch",
      reason: "spam_bot",
    },
    {
      id: "4",
      type: "chat",
      ts: 4,
      uuid: "aaaa-1111",
      name: "Steve",
      message: "привет",
    },
  ] as CompanionEvent[];
  repo.insertMany("s1", events);
});

const names = (q: string) =>
  repo.list("s1", { q, limit: 50 }).map((e) => `${e.type}:${e.name}`);

describe("CompanionEventsRepository search", () => {
  test("matches name ignoring ascii case", () => {
    expect(names("steve")).toEqual(["chat:Steve", "join:Steve"]);
  });

  test("matches uuid, chat message and kick reason", () => {
    expect(names("bbbb")).toEqual(["chat:Alex"]);
    expect(names("привет")).toEqual(["chat:Steve"]);
    expect(names("spam")).toEqual(["kick:Notch"]);
  });

  test("treats like wildcards literally", () => {
    expect(names("100%")).toEqual(["chat:Alex"]);
    expect(names("m_b")).toEqual(["kick:Notch"]);
    expect(names("%")).toEqual(["chat:Alex"]);
  });

  test("combines with type filter", () => {
    expect(
      repo
        .list("s1", { q: "steve", types: ["chat"], limit: 50 })
        .map((e) => e.type),
    ).toEqual(["chat"]);
  });
});

describe("CompanionEventsRepository player filter", () => {
  test("only events of one uuid, with types", () => {
    const of = (types?: CompanionEvent["type"][]) =>
      repo
        .list("s1", { uuid: "AAAA-1111", types, limit: 50 })
        .map((e) => e.type);
    expect(of()).toEqual(["chat", "join"]);
    expect(of(["join"])).toEqual(["join"]);
  });
});
