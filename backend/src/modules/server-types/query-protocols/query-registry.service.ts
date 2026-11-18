import type { QuerySpec } from "@kubekpanel/blueprint-sdk";
import { Injectable } from "@nestjs/common";
import { GamedigQuery } from "./gamedig.query";
import { MinecraftJavaQuery } from "./minecraft-java.query";
import { NoneQuery } from "./none.query";
import type { QueryProtocol } from "./query-protocol.interface";

/**
 * Picks a query adapter for a blueprint.query.protocol
 */
@Injectable()
export class QueryRegistry {
  constructor(
    private readonly java: MinecraftJavaQuery,
    private readonly none: NoneQuery,
    private readonly gamedig: GamedigQuery,
  ) {}

  get(protocol: QuerySpec["protocol"]): QueryProtocol | null {
    switch (protocol) {
      case "minecraft-java":
        return this.java;
      case "none":
        return this.none;
      case "minecraft-bedrock":
        return this.gamedig.forType("mbe");
      case "source-a2s":
        return this.gamedig.forType("protocol-valve");
      default:
        if (protocol.startsWith("gamedig:")) {
          return this.gamedig.forType(protocol.slice("gamedig:".length));
        }
        return null;
    }
  }
}
