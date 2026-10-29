import { describe, expect, test } from "bun:test";
import { CrashRestartPolicy } from "./crash-restart";

describe("CrashRestartPolicy", () => {
  const setting = { enabled: true, attempts: 2 };

  test("restarts up to the attempts, then gives up until reset", () => {
    const policy = new CrashRestartPolicy();

    expect(policy.onCrash(setting, false)).toBe("restart");
    expect(policy.onCrash(setting, false)).toBe("restart");
    expect(policy.onCrash(setting, false)).toBe("exhausted");
    expect(policy.count).toBe(2);

    policy.reset();
    expect(policy.onCrash(setting, false)).toBe("restart");
  });

  test("off when disabled or the exit was asked for", () => {
    const policy = new CrashRestartPolicy();
    expect(policy.onCrash({ enabled: false, attempts: 3 }, false)).toBe("off");
    expect(policy.onCrash(undefined, false)).toBe("off");
    expect(policy.onCrash(setting, true)).toBe("off");
    expect(policy.count).toBe(0);
  });
});
