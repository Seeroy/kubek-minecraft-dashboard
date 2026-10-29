import { describe, expect, test } from "bun:test";
import { runPool } from "./run-pool";

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

describe("runPool", () => {
  test("processes everything with bounded concurrency", async () => {
    let inFlight = 0;
    let peak = 0;
    const seen: number[] = [];
    await runPool([1, 2, 3, 4, 5, 6, 7, 8, 9], 4, async (n) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await tick();
      seen.push(n);
      inFlight--;
    });
    expect(seen.sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(peak).toBe(4);
  });

  test("stops picking up work after a failure", async () => {
    const started: number[] = [];
    const outcome = await runPool([1, 2, 3, 4, 5, 6], 2, async (n) => {
      started.push(n);
      await tick();
      if (n === 1) throw new Error("boom");
    }).then(
      () => "ok",
      (error: Error) => error.message,
    );
    expect(outcome).toBe("boom");
    expect(started.length).toBeLessThan(6);
  });

  test("handles an empty list", async () => {
    let called = false;
    await runPool([], 4, () => {
      called = true;
      return Promise.resolve();
    });
    expect(called).toBe(false);
  });
});
