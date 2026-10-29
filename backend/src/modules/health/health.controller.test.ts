import type { SqliteProvider } from "@/modules/database/sqlite.provider";
import { fake } from "@/testing/fake";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import type { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import type { Response } from "express";
import { HealthController } from "./health.controller";

function fakeRes() {
  const res = { code: 0, headers: {} as Record<string, string> };
  const express: Response = fake<Response>({
    status: (code) => {
      res.code = code;
      return express;
    },
    setHeader: (name, value) => {
      res.headers[name] = String(value);
      return express;
    },
  });
  return { res, express };
}

describe("HealthController", () => {
  test("200 when the database answers", () => {
    const sqlite = sqliteProvider(memoryDatabase());
    const { res, express } = fakeRes();
    const body = new HealthController(sqlite).check(express);
    expect(res.code).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.db).toBe("ok");
  });

  test("503 when the database fails", () => {
    const sqlite = fake<SqliteProvider>({
      get connection(): Database {
        throw new Error("SQLite not initialized");
      },
    });
    const { res, express } = fakeRes();
    const body = new HealthController(sqlite).check(express);
    expect(res.code).toBe(503);
    expect(body).toMatchObject({ status: "error", db: "error" });
  });
});
