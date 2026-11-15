import { describe, expect, it } from "bun:test";
import { withUtf8Locale } from "./locale-env";

describe("withUtf8Locale", () => {
  it("adds a UTF-8 locale when none is set", () => {
    expect(withUtf8Locale({ PATH: "/bin" }, "linux")).toEqual({
      PATH: "/bin",
      LANG: "C.UTF-8",
      LC_ALL: "C.UTF-8",
    });
  });

  it("replaces a non UTF-8 one", () => {
    expect(withUtf8Locale({ LC_ALL: "C", LANG: "C" }, "linux").LC_ALL).toBe(
      "C.UTF-8",
    );
  });

  it("keeps a UTF-8 locale the user picked", () => {
    const env = { LANG: "ru_RU.UTF-8" };
    expect(withUtf8Locale(env, "linux")).toBe(env);
    expect(withUtf8Locale({ LC_CTYPE: "en_US.utf8" }, "linux").LC_ALL).toBe(
      undefined,
    );
  });

  it("leaves other platforms alone", () => {
    const env = {};
    expect(withUtf8Locale(env, "win32")).toBe(env);
    expect(withUtf8Locale(env, "darwin")).toBe(env);
  });
});
