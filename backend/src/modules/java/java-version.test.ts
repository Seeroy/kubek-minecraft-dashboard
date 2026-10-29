import { describe, expect, test } from "bun:test";
import { adoptiumArch, adoptiumOs } from "./java-platform";
import { extractVersionNumber, parseJavaVersionLine } from "./java-version";

describe("parseJavaVersionLine", () => {
  test("reads a modern openjdk line", () => {
    expect(
      parseJavaVersionLine('openjdk version "21.0.4" 2024-07-16 LTS'),
    ).toEqual({ vendor: "21.0.4", build: undefined, runtime: "21.0.4" });
  });

  test("reads a legacy java 8 line", () => {
    expect(parseJavaVersionLine('java version "1.8.0_402"').runtime).toBe(
      "1.8.0_402",
    );
  });

  test("returns nothing for garbage", () => {
    expect(parseJavaVersionLine("command not found")).toEqual({
      vendor: undefined,
      build: undefined,
      runtime: undefined,
    });
  });
});

describe("extractVersionNumber", () => {
  test("takes the dotted triple", () => {
    expect(extractVersionNumber("17.0.12+7")).toBe("17.0.12");
    expect(extractVersionNumber("1.8.0_402")).toBe("1.8.0");
  });

  test("falls back to the input", () => {
    expect(extractVersionNumber("22")).toBe("22");
  });
});

describe("adoptium mapping", () => {
  test("maps node names to adoptium ones", () => {
    expect(adoptiumArch("arm64")).toBe("aarch64");
    expect(adoptiumArch("x64")).toBe("x64");
    expect(adoptiumOs("darwin")).toBe("mac");
    expect(adoptiumOs("win32")).toBe("windows");
  });

  test("throws for unsupported targets", () => {
    expect(() => adoptiumArch("mips")).toThrow("not supported");
    expect(() => adoptiumOs("android")).toThrow("not supported");
  });
});
