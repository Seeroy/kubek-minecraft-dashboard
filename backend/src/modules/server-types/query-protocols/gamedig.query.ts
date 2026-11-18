import { Injectable } from "@nestjs/common";
import { GameDig, type QueryResult as GamedigResult } from "gamedig";
import type { QueryProtocol, QueryResult } from "./query-protocol.interface";

// gamedig ids are short lowercase words like "valheim" or "protocol-valve"
const TYPE = /^[a-z0-9][\w-]*$/;

/** Players and version from a gamedig answer */
export function fromGamedig(state: GamedigResult): QueryResult {
  const players = state.players ?? [];
  return {
    players: {
      max: state.maxplayers,
      online: state.numplayers ?? players.length,
      list: players
        .map((p) => p.name?.trim())
        .filter((name): name is string => !!name),
    },
    version: state.version || undefined,
  };
}

/** Query through gamedig: Valve A2S, Bedrock and most game protocols */
@Injectable()
export class GamedigQuery {
  private readonly adapters = new Map<string, QueryProtocol>();

  /** null when the type isn't a plain gamedig id */
  forType(type: string): QueryProtocol | null {
    if (!TYPE.test(type)) return null;
    let adapter = this.adapters.get(type);
    if (!adapter) {
      adapter = {
        query: async ({ host, port }) => {
          const state = await GameDig.query({
            type,
            host,
            port,
            // We pass the exact query port
            givenPortOnly: true,
            maxRetries: 1,
            socketTimeout: 2000,
            attemptTimeout: 5000,
          });
          return fromGamedig(state);
        },
      };
      this.adapters.set(type, adapter);
    }
    return adapter;
  }
}
