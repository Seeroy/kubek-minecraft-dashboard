import { describe, expect, test } from "bun:test";
import {
  blueprintStopTimeoutSec,
  DEFAULT_STOP_TIMEOUT_SEC,
  stopTimeoutSec,
} from "./stopTimeout";

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

describe("blueprintStopTimeoutSec", () => {
  test("keeps a valid value", () => {
    expect(blueprintStopTimeoutSec(10)).toBe(10);
    expect(blueprintStopTimeoutSec(2.6)).toBe(3);
  });

  test("falls back to the panel default on bad input", () => {
    expect(blueprintStopTimeoutSec(undefined)).toBeUndefined();
    expect(blueprintStopTimeoutSec("10")).toBeUndefined();
    expect(blueprintStopTimeoutSec(0)).toBeUndefined();
    expect(blueprintStopTimeoutSec(Number.NaN)).toBeUndefined();
  });

  test("caps huge values", () => {
    expect(blueprintStopTimeoutSec(1e9)).toBe(3600);
  });
});
