import { expect, test } from "bun:test";
import { compareVersions } from "./version";

test("compares versions part by part", () => {
  expect(compareVersions("1.0.0", "1.0.1")).toBeLessThan(0);
  expect(compareVersions("1.10.0", "1.9.9")).toBeGreaterThan(0);
  expect(compareVersions("v1.2", "1.2.0")).toBe(0);
  expect(compareVersions("2.0.0-beta", "1.9")).toBeGreaterThan(0);
});
