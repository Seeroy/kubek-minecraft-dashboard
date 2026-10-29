import { describe, expect, it } from "bun:test";
import { REDACTED } from "../runner/redact";
import { applyEdits, containsRedaction, looksBinary } from "./file-edits";

describe("applyEdits", () => {
  it("applies edits in order", () => {
    expect(
      applyEdits("a=1\nb=2\n", [
        { find: "a=1", replace: "a=3" },
        { find: "a=3\nb", replace: "c" },
      ]),
    ).toEqual({ ok: true, text: "c=2\n" });
  });

  it("rejects a missing match", () => {
    const out = applyEdits("x", [{ find: "y", replace: "z" }]);
    expect(out.ok).toBe(false);
  });

  it("rejects an ambiguous match", () => {
    const out = applyEdits("aa", [{ find: "a", replace: "b" }]);
    expect(out).toEqual({
      ok: false,
      error:
        "Edit 1: text to find matches more than once, add surrounding lines",
    });
  });
});

describe("helpers", () => {
  it("spots the redaction marker", () => {
    expect(containsRedaction(`rcon.password=${REDACTED}`)).toBe(true);
    expect(containsRedaction("rcon.password=x")).toBe(false);
  });

  it("spots binary content", () => {
    expect(looksBinary(Buffer.from([1, 0, 2]))).toBe(true);
    expect(looksBinary(Buffer.from("text"))).toBe(false);
  });
});
