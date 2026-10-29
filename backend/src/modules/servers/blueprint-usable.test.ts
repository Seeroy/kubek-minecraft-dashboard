import { describe, expect, test } from "bun:test";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import type { LoadedBlueprint } from "@/modules/server-types/server-types.types";
import type {
  KubekBlueprintManifest,
  KubekPlatform,
} from "@kubekpanel/blueprint-sdk";
import { BadRequestException } from "@nestjs/common";
import { assertBlueprintUsable } from "./blueprint-usable";

function manifest(
  id: string,
  overrides: Partial<KubekBlueprintManifest> = {},
): KubekBlueprintManifest {
  return {
    manifestVersion: 1,
    id,
    name: id,
    game: "test",
    version: "1.0.0",
    runtime: { kind: "native" },
    variables: [],
    versions: { kind: "none" },
    install: { steps: [] },
    startup: { command: "run", stop: { type: "command", value: "stop" } },
    query: { protocol: "none", port: { value: 0 } },
    ports: [],
    ...overrides,
  };
}

const otherPlatform: KubekPlatform =
  process.platform === "win32" ? "linux" : "win32";

class TestRegistry extends ServerTypesRegistry {
  private readonly items = new Map<string, LoadedBlueprint>([
    ["native", this.entry(manifest("native"))],
    [
      "dual",
      this.entry(
        manifest("dual", { dockerProfile: { image: "img", env: {} } }),
      ),
    ],
    [
      "docker-only",
      this.entry(
        manifest("docker-only", {
          runtime: { kind: "docker" },
          dockerProfile: { image: "img", env: {} },
        }),
      ),
    ],
    ["broken", { ...this.entry(manifest("broken")), valid: false }],
    [
      "elsewhere",
      this.entry(manifest("elsewhere", { platforms: [otherPlatform] })),
    ],
    [
      "here",
      this.entry(
        manifest("here", { platforms: [process.platform as KubekPlatform] }),
      ),
    ],
  ]);
  private entry(m: KubekBlueprintManifest): LoadedBlueprint {
    return { manifest: m, dir: "", source: "bundled", valid: true, errors: [] };
  }
  get(id: string): LoadedBlueprint | undefined {
    return this.items.get(id);
  }
}

const registry = new TestRegistry();

describe("assertBlueprintUsable", () => {
  test("a valid blueprint is returned", () => {
    expect(assertBlueprintUsable(registry, "dual").manifest.id).toBe("dual");
    expect(assertBlueprintUsable(registry, "here").manifest.id).toBe("here");
  });

  test.each(["missing", "broken"])("%s blueprint is refused", (id) => {
    expect(() => assertBlueprintUsable(registry, id)).toThrow(
      `Unknown or invalid blueprint: ${id}`,
    );
  });

  test("a blueprint for another platform is refused", () => {
    expect(() => assertBlueprintUsable(registry, "elsewhere")).toThrow(
      "is not supported on this platform",
    );
  });

  test("a docker server can only switch to a core with a docker profile", () => {
    expect(() => assertBlueprintUsable(registry, "native", "docker")).toThrow(
      BadRequestException,
    );
    expect(assertBlueprintUsable(registry, "dual", "docker").manifest.id).toBe(
      "dual",
    );
  });

  test("a native server cannot switch to a docker only core", () => {
    expect(() =>
      assertBlueprintUsable(registry, "docker-only", "native"),
    ).toThrow("This core is docker-only");
    expect(assertBlueprintUsable(registry, "dual", "native").manifest.id).toBe(
      "dual",
    );
  });

  test("without a runtime any usable core passes", () => {
    expect(assertBlueprintUsable(registry, "docker-only").manifest.id).toBe(
      "docker-only",
    );
  });
});
