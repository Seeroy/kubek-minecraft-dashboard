import { describe, expect, test } from "bun:test";
import {
  propertyFlag,
  propertyPort,
  toPropertyRecord,
} from "./properties-values";

describe("toPropertyRecord", () => {
  test("stringifies scalars and drops nulls", () => {
    expect(
      toPropertyRecord({
        motd: "hi",
        "max-players": 20,
        pvp: false,
        "level-name": "",
        gone: null,
        skip: undefined,
      }),
    ).toEqual({
      motd: "hi",
      "max-players": "20",
      pvp: "false",
      "level-name": "",
    });
  });

  test("serializes objects as JSON", () => {
    expect(toPropertyRecord({ "generator-settings": { a: 1 } })).toEqual({
      "generator-settings": '{"a":1}',
    });
  });
});

describe("property readers", () => {
  test("flag", () => {
    expect(propertyFlag("true")).toBe(true);
    expect(propertyFlag(" TRUE ")).toBe(true);
    expect(propertyFlag("false")).toBe(false);
    expect(propertyFlag(undefined)).toBe(false);
  });

  test("port", () => {
    expect(propertyPort("25565")).toBe(25565);
    expect(propertyPort("")).toBeUndefined();
    expect(propertyPort("0")).toBeUndefined();
    expect(propertyPort("70000")).toBeUndefined();
  });
});
