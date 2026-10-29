import { describe, expect, test } from "bun:test";
import { AttemptLimiter } from "./attempt-limiter";

const MIN = 60_000;

describe("backoff", () => {
  const make = () =>
    new AttemptLimiter({
      kind: "backoff",
      freeFailures: 3,
      baseLockMs: MIN,
      maxLockMs: 4 * MIN,
      forgetAfterMs: 60 * MIN,
    });

  test("free failures do not lock", () => {
    const limiter = make();
    for (let i = 0; i < 3; i++) expect(limiter.fail("k", 0).lockMs).toBe(0);
    expect(limiter.retryAfter("k", 0)).toBe(0);
  });

  test("lock doubles and is capped", () => {
    const limiter = make();
    for (let i = 0; i < 3; i++) limiter.fail("k", 0);
    expect(limiter.fail("k", 0)).toEqual({ lockMs: MIN, justLocked: true });
    expect(limiter.fail("k", 0)).toEqual({
      lockMs: 2 * MIN,
      justLocked: false,
    });
    expect(limiter.fail("k", 0).lockMs).toBe(4 * MIN);
    expect(limiter.fail("k", 0).lockMs).toBe(4 * MIN);
  });

  test("lock expires with time", () => {
    const limiter = make();
    for (let i = 0; i < 4; i++) limiter.fail("k", 0);
    expect(limiter.retryAfter("k", MIN / 2)).toBe(MIN / 2);
    expect(limiter.retryAfter("k", MIN)).toBe(0);
  });

  test("failures are forgotten after a quiet period", () => {
    const limiter = make();
    for (let i = 0; i < 3; i++) limiter.fail("k", 0);
    expect(limiter.fail("k", 61 * MIN).lockMs).toBe(0);
  });

  test("reset clears the key", () => {
    const limiter = make();
    for (let i = 0; i < 4; i++) limiter.fail("k", 0);
    limiter.reset("k");
    expect(limiter.retryAfter("k", 0)).toBe(0);
  });

  test("keys are independent", () => {
    const limiter = make();
    for (let i = 0; i < 4; i++) limiter.fail("a", 0);
    expect(limiter.retryAfter("b", 0)).toBe(0);
  });
});

describe("window", () => {
  const make = () =>
    new AttemptLimiter({ kind: "window", limit: 2, windowMs: MIN });

  test("allows up to the limit, then waits for the window end", () => {
    const limiter = make();
    expect(limiter.hit("k", 0)).toBe(0);
    expect(limiter.hit("k", 1000)).toBe(0);
    expect(limiter.hit("k", 2000)).toBe(MIN - 2000);
    expect(limiter.retryAfter("k", 30_000)).toBe(30_000);
  });

  test("a new window starts fresh", () => {
    const limiter = make();
    for (let i = 0; i < 3; i++) limiter.hit("k", 0);
    expect(limiter.hit("k", MIN)).toBe(0);
  });

  test("mixing policy kinds is a programming error", () => {
    expect(() => make().fail("k", 0)).toThrow();
  });
});
