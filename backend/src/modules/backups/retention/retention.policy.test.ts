import { describe, expect, test } from "bun:test";
import { planRetention } from "./retention.policy";

const DAY = 24 * 60 * 60 * 1000;
const now = 100 * DAY;
const copy = (id: string, ageDays: number, pinned = false) => ({
  id,
  createdAt: now - ageDays * DAY,
  pinned,
});
const ids = (list: { id: string }[]) => list.map((c) => c.id).sort();

describe("planRetention", () => {
  const copies = [copy("a", 0), copy("b", 1), copy("c", 2), copy("d", 10)];

  test("no limits keeps everything", () => {
    expect(
      planRetention(copies, { keepCount: null, keepDays: null }, now),
    ).toEqual([]);
  });

  test("keeps the newest N", () => {
    expect(
      ids(planRetention(copies, { keepCount: 2, keepDays: null }, now)),
    ).toEqual(["c", "d"]);
  });

  test("drops copies older than the age limit", () => {
    expect(
      ids(planRetention(copies, { keepCount: null, keepDays: 5 }, now)),
    ).toEqual(["d"]);
  });

  test("either limit removes a copy", () => {
    expect(
      ids(planRetention(copies, { keepCount: 3, keepDays: 1.5 }, now)),
    ).toEqual(["c", "d"]);
  });

  test("the newest copy survives even when it is too old", () => {
    const old = [copy("x", 30), copy("y", 40)];
    expect(
      ids(planRetention(old, { keepCount: null, keepDays: 7 }, now)),
    ).toEqual(["y"]);
  });

  test("pinned copies are kept and do not use up the count", () => {
    const list = [copy("a", 0), copy("p", 1, true), copy("b", 2), copy("c", 3)];
    expect(
      ids(planRetention(list, { keepCount: 2, keepDays: null }, now)),
    ).toEqual(["c"]);
  });

  test("a zero count still keeps the newest", () => {
    expect(
      ids(planRetention(copies, { keepCount: 0, keepDays: null }, now)),
    ).toEqual(["b", "c", "d"]);
  });
});
