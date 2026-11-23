import { describe, expect, it } from "bun:test";
import type { SettingField } from "@kubekpanel/extension-sdk";
import { applySettings, checkRules, viewSettings, withDefaults } from "./extension-settings";

const schema: SettingField[] = [
  { key: "name", type: "string", label: "Name", default: "bot", rules: "required|min:2|max:10" },
  { key: "port", type: "number", label: "Port", default: 8080, rules: "min:1|max:65535" },
  { key: "on", type: "boolean", label: "On" },
  { key: "mode", type: "select", label: "Mode", options: ["a", "b"] },
  { key: "tags", type: "multiselect", label: "Tags", options: ["x", "y"] },
  { key: "hook", type: "string", label: "Hook", rules: "url|odd:rule" },
  { key: "token", type: "secret", label: "Token", rules: "required" },
  { key: "pass", type: "string", label: "Pass", secret: true },
];

describe("settings view", () => {
  it("shows saved or default values and only whether secrets are set", () => {
    const view = viewSettings(schema, { port: 25565, token: "t0p", pass: "" });
    expect(view.values).toEqual({
      name: "bot",
      port: 25565,
      on: null,
      mode: null,
      tags: null,
      hook: null,
    });
    expect(view.secrets).toEqual({ token: true, pass: false });
    expect(JSON.stringify(view)).not.toContain("t0p");
  });

  it("ctx.config falls back to the schema default", () => {
    expect(withDefaults(schema, { port: 1 })).toEqual({ name: "bot", port: 1 });
  });
});

describe("settings submit", () => {
  const saved = { token: "old" };

  it("saves valid values and reports changed keys", () => {
    const r = applySettings(schema, saved, {
      name: "kubek",
      port: 9000,
      on: true,
      mode: "b",
      tags: ["x"],
      hook: "https://example.com/h",
      junk: 1,
    });
    expect(r.errors).toEqual([]);
    expect(r.next).toEqual({ ...saved, name: "kubek", port: 9000, on: true, mode: "b", tags: ["x"], hook: "https://example.com/h" });
    expect(r.changed).toEqual(["name", "port", "on", "mode", "tags", "hook"]);
  });

  it("secrets: set, keep on missing or empty, clear on null", () => {
    expect(applySettings(schema, saved, { token: "new" }).next.token).toBe("new");
    expect(applySettings(schema, saved, { token: "" }).next.token).toBe("old");
    expect(applySettings(schema, saved, {}).changed).toEqual([]);
    const cleared = applySettings(schema, { token: "old", pass: "p" }, { pass: null });
    expect(cleared.next).toEqual({ token: "old" });
    expect(cleared.changed).toEqual(["pass"]);
  });

  it("null resets a plain field to its default", () => {
    const r = applySettings(schema, { ...saved, port: 1 }, { port: null });
    expect(r.next.port).toBeUndefined();
    expect(r.errors).toEqual([]);
  });

  it("rejects wrong types and options", () => {
    const r = applySettings(schema, saved, {
      name: 5,
      port: "80",
      on: "yes",
      mode: "c",
      tags: ["x", "z"],
      token: 7,
    });
    expect(r.errors).toEqual([
      { field: "name", message: "type" },
      { field: "port", message: "type" },
      { field: "on", message: "type" },
      { field: "mode", message: "options" },
      { field: "tags", message: "options" },
      { field: "token", message: "type" },
    ]);
  });

  it("checks rules on what would be saved", () => {
    const r = applySettings(schema, {}, { name: "k", port: 70000, hook: "ftp://x" });
    expect(r.errors).toEqual([
      { field: "name", message: "min:2" },
      { field: "port", message: "max:65535" },
      { field: "hook", message: "url" },
      { field: "token", message: "required" },
    ]);
  });
});

describe("rules", () => {
  it("required, url, min and max", () => {
    expect(checkRules("required", "")).toBe("required");
    expect(checkRules("required", [])).toBe("required");
    expect(checkRules("required", false)).toBeNull();
    expect(checkRules("url", "http://a.b")).toBeNull();
    expect(checkRules("url", "nope")).toBe("url");
    expect(checkRules("min:3", "ab")).toBe("min:3");
    expect(checkRules("min:3", 2)).toBe("min:3");
    expect(checkRules("max:1", ["a", "b"])).toBe("max:1");
    expect(checkRules("min:3", "")).toBeNull();
    expect(checkRules("whatever:1|max:5", 3)).toBeNull();
  });
});
