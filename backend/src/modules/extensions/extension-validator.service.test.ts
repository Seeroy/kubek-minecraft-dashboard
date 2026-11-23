import { describe, expect, it } from "bun:test";
import type { KubekExtensionManifest } from "@kubekpanel/extension-sdk";
import { ExtensionValidator } from "./extension-validator.service";

const base = (extra: Record<string, unknown> = {}) =>
  ({
    manifestVersion: 1,
    id: "com.acme.ext",
    name: "Ext",
    version: "1.0.0",
    engines: { kubek: ">=4.0.0" },
    permissions: {},
    backend: { entry: "backend/index.ts" },
    ...extra,
  }) as unknown as KubekExtensionManifest;

const validate = (m: KubekExtensionManifest) => new ExtensionValidator().validate(m);

describe("ExtensionValidator", () => {
  it("accepts a minimal manifest", () => {
    expect(validate(base())).toEqual([]);
  });

  it("checks slots, isolation and declared permissions", () => {
    expect(
      validate(
        base({
          backend: { entry: "b.ts", isolation: "thread" },
          frontend: {
            entry: "f.ts",
            contributes: { slots: [{ slot: "login.footer", component: "A" }, { slot: "nav.top", component: "B" }, { slot: "server.sidebar" }] },
          },
          permissions: { declares: [{ key: "file_manager", label: "x" }, { key: "com.acme.ext.use", label: "y" }, {}] },
        }),
      ),
    ).toEqual([
      'permission "file_manager" is a core permission',
      "every declared permission needs a key",
      'backend.isolation must be "in-process" or "worker"',
      'unknown slot "nav.top"',
      'slot "server.sidebar" needs a component',
    ]);
  });

  it("checks settingsSchema types and options", () => {
    expect(
      validate(
        base({
          settingsSchema: [
            { key: "a", type: "string", label: "A" },
            { key: "a", type: "color", label: "A again" },
            { key: "s", type: "select", label: "S" },
            { key: "m", type: "multiselect", label: "M", options: ["x"] },
            { type: "string", label: "no key" },
          ],
        }),
      ),
    ).toEqual([
      'settingsSchema key "a" is used twice',
      'settingsSchema "a" has unknown type "color"',
      'settingsSchema "s" needs a list of options',
      "every settingsSchema field needs a key",
    ]);
  });

  it("rejects shapes that would crash at activation", () => {
    expect(
      validate(
        base({
          permissions: { requires: "storage", declares: {} },
          settingsSchema: {},
          frontend: { contributes: { slots: {} } },
        }),
      ),
    ).toEqual([
      "permissions.requires must be a list",
      "permissions.declares must be a list",
      "frontend.entry is required",
      "frontend.contributes.slots must be a list",
      "settingsSchema must be a list",
    ]);
  });
});
