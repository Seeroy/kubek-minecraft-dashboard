import { getFullInfo } from "@hloth/minecraft-query";
import { Injectable } from "@nestjs/common";
import type { QueryProtocol, QueryResult } from "./query-protocol.interface";

/** Minecraft Java query, lifted from the previous ServerInstance.queryServer */
@Injectable()
export class MinecraftJavaQuery implements QueryProtocol {
  async query({
    host,
    port,
  }: {
    host: string;
    port: number;
  }): Promise<QueryResult | null> {
    const full = await getFullInfo({ hostname: host, port });
    if (!full) return null;

    return {
      players: {
        max: full.maxPlayers,
        online: full.onlinePlayers,
        list: full.players,
      },
      version: full.version,
    };
  }
}
