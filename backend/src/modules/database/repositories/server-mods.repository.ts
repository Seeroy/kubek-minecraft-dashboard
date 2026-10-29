import { Injectable } from "@nestjs/common";
import { SqliteProvider } from "../sqlite.provider";
import { ServerContentRepository } from "./server-content.repository";

/**
 * Stores Modrinth-managed mods per server
 */
@Injectable()
export class ServerModsRepository extends ServerContentRepository {
  constructor(sqlite: SqliteProvider) {
    super(sqlite, "mod");
  }
}
