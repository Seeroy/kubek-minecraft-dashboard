import { describe, expect, test } from "bun:test";
import { PendingStop } from "./pending-stop";

describe("PendingStop", () => {
  test("an exit settles the stop and frees the slot", async () => {
    const stop = new PendingStop();
    let escalated = false;

    const done = stop.begin(() => {
      escalated = true;
    });
    expect(stop.current).toBe(done);

    stop.exited();
    expect(await done).toBe(true);
    expect(stop.current).toBeUndefined();
    expect(escalated).toBe(false);
  });

  test("an exit with no stop in flight does nothing", () => {
    const stop = new PendingStop();
    stop.exited();
    expect(stop.current).toBeUndefined();
  });
});
