import { Injectable } from "@nestjs/common";
import { SqliteProvider } from "../sqlite.provider";
import { ServerContentRepository } from "./server-content.repository";

export { IServerPluginsRepository } from "./server-content.repository";

/**
 * Stores Modrinth-managed plugins per server
 */
@Injectable()
export class ServerPluginsRepository extends ServerContentRepository {
  constructor(sqlite: SqliteProvider) {
    super(sqlite, "plugin");
  }
}
