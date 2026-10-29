import { describe, expect, test } from "bun:test";
import { asciiComments } from "./ascii-comments.ts";

describe("asciiComments", () => {
  test("escapes kept comments", () => {
    expect(asciiComments("/*! MIT License © Sindre Sorhus */\nx();")).toBe(
      "/*! MIT License \\u00a9 Sindre Sorhus */\nx();",
    );
    expect(asciiComments("//@license © me\n")).toBe("//@license \\u00a9 me\n");
  });

  test("leaves code and plain comments alone", () => {
    const source = 'const a = "©"; // ©\n/* © */';
    expect(asciiComments(source)).toBe(source);
  });

  test("a string that looks like a comment keeps its value", () => {
    const source = 'module.exports = "/*! ✓ 😀 */";';
    const exports = { value: "" };
    new Function("module", asciiComments(source))({
      set exports(v: string) {
        exports.value = v;
      },
    });
    expect(exports.value).toBe("/*! ✓ 😀 */");
    expect(asciiComments(source)).toMatch(/^[\x00-\x7f]*$/);
  });
});
