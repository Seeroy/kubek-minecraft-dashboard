import { describe, expect, test } from "bun:test";
import { lineDiff } from "./line-diff";

const range = (from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, i) => `l${from + i}`);

describe("lineDiff", () => {
  test("marks a replaced line", () => {
    expect(lineDiff("a\nb\nc\n", "a\nx\nc\n")).toEqual([
      { op: "same", text: "a" },
      { op: "del", text: "b" },
      { op: "add", text: "x" },
      { op: "same", text: "c" },
    ]);
  });

  test("folds unchanged runs outside the context", () => {
    const before = range(1, 20).join("\n");
    const after = before.replace("l10", "changed");
    const diff = lineDiff(before, after, 2);
    expect(diff[0]).toEqual({ op: "skip", count: 7 });
    expect(diff.filter((line) => line.op !== "skip")).toHaveLength(6);
    expect(diff[diff.length - 1]).toEqual({ op: "skip", count: 8 });
  });

  test("a new file is all additions", () => {
    expect(lineDiff("", "a\nb")).toEqual([
      { op: "add", text: "a" },
      { op: "add", text: "b" },
    ]);
  });

  test("equal texts fold into one skip", () => {
    expect(lineDiff("a\nb", "a\nb")).toEqual([{ op: "skip", count: 2 }]);
  });
});
