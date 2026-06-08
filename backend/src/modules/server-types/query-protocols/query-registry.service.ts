import type { QuerySpec } from "@kubekpanel/blueprint-sdk";
import { Injectable } from "@nestjs/common";
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
  ) {}

  get(protocol: QuerySpec["protocol"]): QueryProtocol | null {
    switch (protocol) {
      case "minecraft-java":
        return this.java;
      case "none":
        return this.none;
      // TODO: Implement others
      default:
        return null;
    }
  }
}
