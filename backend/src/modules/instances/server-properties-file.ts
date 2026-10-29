import {
  readPropertiesFile,
  updatePropertiesFile,
} from "@/core/properties/properties-file";
import {
  propertyPort,
  toPropertyRecord,
} from "@/core/properties/properties-values";
import { getRealServerPath } from "@/core/utils/serverPath";

export interface ServerPropertiesSnapshot {
  values: Record<string, string>;
  port?: number;
  queryPort?: number;
}

/** server.properties of a server, keeps comments and other lines on write */
export class ServerPropertiesFile {
  constructor(private readonly serverId: string) {}

  /** Null if missing or unreadable */
  async read(): Promise<ServerPropertiesSnapshot | null> {
    try {
      const doc = await readPropertiesFile(await this.path());
      if (!doc) return null;
      return {
        values: doc.toRecord(),
        port: propertyPort(doc.get("server-port")),
        queryPort: propertyPort(doc.get("query.port")),
      };
    } catch {
      return null;
    }
  }

  /** Replace all keys, false if writing failed */
  async write(data: Record<string, unknown>): Promise<boolean> {
    try {
      await updatePropertiesFile(await this.path(), (doc) =>
        doc.assign(toPropertyRecord(data)),
      );
      return true;
    } catch {
      return false;
    }
  }

  private path(): Promise<string> {
    return getRealServerPath(this.serverId, "server.properties");
  }
}
