import { Database } from "bun:sqlite";
import { beforeEach, describe, expect, test } from "bun:test";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import { ConfigRepository } from "./config.repository";

let db: Database;
let config: ConfigRepository;

const raw = (key: string) =>
  (
    db.query("SELECT value FROM config_kv WHERE key = ?").get(key) as {
      value: string;
    } | null
  )?.value;

beforeEach(() => {
  db = memoryDatabase();
  config = new ConfigRepository(sqliteProvider(db));
});

describe("ConfigRepository", () => {
  test("a fresh database has the default settings", () => {
    expect(config.getAll()).toEqual({
      eulaAccepted: false,
      authorization: false,
      port: 8000,
      configVersion: 1,
      ftpd: { enabled: false },
      subnetsAccessRestriction: { enabled: false },
      telegramBot: { enabled: false },
      serverRuntime: "auto",
    });
  });

  test("set stores one setting and keeps the others", () => {
    config.set("telegramBot", {
      enabled: true,
      token: "123:abc",
      chatIds: ["1", "2"],
    });
    config.set("port", 9000);
    config.set("eulaAccepted", true);

    expect(config.get("telegramBot")).toEqual({
      enabled: true,
      token: "123:abc",
      chatIds: ["1", "2"],
    });
    expect(config.get("port")).toBe(9000);
    expect(config.get("eulaAccepted")).toBe(true);
    expect(raw("eulaAccepted")).toBe("1");
    expect(config.get("ftpd")).toEqual({ enabled: false });
  });

  test("updateAll merges and returns the whole config", () => {
    const next = config.updateAll({
      authorization: true,
      serverRuntime: "docker",
      subnetsAccessRestriction: { enabled: true, subnets: ["10.0.0.0/8"] },
    });

    expect(next).toEqual(config.getAll());
    expect(next).toMatchObject({
      authorization: true,
      serverRuntime: "docker",
      subnetsAccessRestriction: { enabled: true, subnets: ["10.0.0.0/8"] },
      port: 8000,
    });
  });

  test("settings without a column round trip as json", () => {
    config.updateAll({
      telemetry: { enabled: true },
      serverStats: { enabled: false },
      customNote: "hello",
    });

    expect(config.get("telemetry")).toEqual({ enabled: true });
    expect(config.get("serverStats")).toEqual({ enabled: false });
    expect(config.get("customNote")).toBe("hello");
    expect(raw("customNote")).toBe('"hello"');
  });

  test("broken json falls back to the default", () => {
    db.run("UPDATE config_kv SET value = 'not json' WHERE key = 'ftpd'");
    db.run("INSERT INTO config_kv (key, value) VALUES ('legacy', 'plain')");

    expect(config.get("ftpd")).toEqual({ enabled: false });
    expect(config.get("legacy")).toBe("plain");
  });
});
