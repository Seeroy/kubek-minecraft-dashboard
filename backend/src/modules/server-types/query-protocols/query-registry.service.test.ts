import { describe, expect, test } from "bun:test";
import type { QueryResult as GamedigResult } from "gamedig";
import { fromGamedig, GamedigQuery } from "./gamedig.query";
import { MinecraftJavaQuery } from "./minecraft-java.query";
import { NoneQuery } from "./none.query";
import { QueryRegistry } from "./query-registry.service";

class RecordingGamedig extends GamedigQuery {
  types: string[] = [];
  override forType(type: string) {
    this.types.push(type);
    return super.forType(type);
  }
}

function registry() {
  const gamedig = new RecordingGamedig();
  return {
    gamedig,
    registry: new QueryRegistry(
      new MinecraftJavaQuery(),
      new NoneQuery(),
      gamedig,
    ),
  };
}

describe("QueryRegistry", () => {
  test("maps protocols to gamedig types", () => {
    const { registry: r, gamedig } = registry();
    expect(r.get("minecraft-bedrock")).not.toBeNull();
    expect(r.get("source-a2s")).not.toBeNull();
    expect(r.get("gamedig:valheim")).not.toBeNull();
    expect(gamedig.types).toEqual(["mbe", "protocol-valve", "valheim"]);
  });

  test("keeps the built in adapters", () => {
    const { registry: r } = registry();
    expect(r.get("minecraft-java")).toBeInstanceOf(MinecraftJavaQuery);
    expect(r.get("none")).toBeInstanceOf(NoneQuery);
  });

  test("a gamedig type that is not a plain id gets no adapter", () => {
    const { registry: r } = registry();
    expect(r.get("gamedig:../x")).toBeNull();
    expect(r.get("gamedig:")).toBeNull();
  });
});

describe("fromGamedig", () => {
  const state = (overrides: Partial<GamedigResult>): GamedigResult => ({
    name: "srv",
    map: "",
    password: false,
    numplayers: 0,
    maxplayers: 10,
    players: [],
    bots: [],
    connect: "",
    ping: 1,
    queryPort: 27015,
    version: "",
    ...overrides,
  });

  test("takes the count, names and version", () => {
    expect(
      fromGamedig(
        state({
          numplayers: 3,
          players: [{ name: "Alex" }, { name: "  " }, {}, { name: "Steve " }],
          version: "1.0.2",
        }),
      ),
    ).toEqual({
      players: { max: 10, online: 3, list: ["Alex", "Steve"] },
      version: "1.0.2",
    });
  });

  test("an empty version stays unset", () => {
    expect(fromGamedig(state({})).version).toBeUndefined();
  });
});
