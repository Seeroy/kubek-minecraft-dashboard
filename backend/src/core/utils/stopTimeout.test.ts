import { describe, expect, test } from "bun:test";
import { DEFAULT_STOP_TIMEOUT_SEC, stopTimeoutSec } from "./stopTimeout";

describe("stopTimeoutSec", () => {
  test("defaults when unset or invalid", () => {
    expect(stopTimeoutSec(undefined)).toBe(DEFAULT_STOP_TIMEOUT_SEC);
    expect(stopTimeoutSec("")).toBe(DEFAULT_STOP_TIMEOUT_SEC);
    expect(stopTimeoutSec("abc")).toBe(DEFAULT_STOP_TIMEOUT_SEC);
    expect(stopTimeoutSec("0")).toBe(DEFAULT_STOP_TIMEOUT_SEC);
    expect(stopTimeoutSec("-5")).toBe(DEFAULT_STOP_TIMEOUT_SEC);
  });

  test("reads seconds from the env value", () => {
    expect(stopTimeoutSec("120")).toBe(120);
    expect(stopTimeoutSec("15.4")).toBe(15);
  });

  test("caps huge values", () => {
    expect(stopTimeoutSec("999999")).toBe(3600);
  });
});
