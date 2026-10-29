import { Injectable } from "@nestjs/common";
import type { ForwardingMode } from "@shared/types/network.types";
import { randomUUID } from "crypto";
import { SqliteProvider } from "../sqlite.provider";

export interface NetworkRecord {
  id: string;
  name: string;
  proxyServerId: string;
  forwardingMode: ForwardingMode;
  createdAt: number;
}

export interface NetworkMemberRecord {
  networkId: string;
  serverId: string;
  alias: string;
  tryOrder: number | null;
}

export type NewNetworkMember = Omit<NetworkMemberRecord, "networkId">;

export abstract class INetworksRepository {
  abstract findAll(): NetworkRecord[];

  abstract findById(id: string): NetworkRecord | null;

  /** Network the server runs as proxy or belongs to */
  abstract findByServer(serverId: string): NetworkRecord | null;

  abstract members(networkId: string): NetworkMemberRecord[];

  abstract create(
    network: Omit<NetworkRecord, "id" | "createdAt">,
    members: NewNetworkMember[],
  ): NetworkRecord;

  abstract update(
    id: string,
    changes: Partial<Pick<NetworkRecord, "forwardingMode">>,
  ): void;

  /** Replaces the member list in one go */
  abstract setMembers(networkId: string, members: NewNetworkMember[]): void;

  abstract delete(id: string): boolean;
}

@Injectable()
export class NetworksRepository implements INetworksRepository {
  constructor(private readonly sqlite: SqliteProvider) {}

  findAll(): NetworkRecord[] {
    return this.sqlite.connection
      .query("SELECT * FROM networks ORDER BY createdAt")
      .all()
      .map((row) => this.deserialize(row));
  }

  findById(id: string): NetworkRecord | null {
    const row = this.sqlite.connection
      .query("SELECT * FROM networks WHERE id = ?")
      .get(id);
    return row ? this.deserialize(row) : null;
  }

  findByServer(serverId: string): NetworkRecord | null {
    const row = this.sqlite.connection
      .query(
        `SELECT n.* FROM networks n
         LEFT JOIN network_members m ON m.networkId = n.id AND m.serverId = ?1
         WHERE n.proxyServerId = ?1 OR m.serverId IS NOT NULL
         LIMIT 1`,
      )
      .get(serverId);
    return row ? this.deserialize(row) : null;
  }

  members(networkId: string): NetworkMemberRecord[] {
    return this.sqlite.connection
      .query(
        `SELECT * FROM network_members WHERE networkId = ?
         ORDER BY tryOrder IS NULL, tryOrder, alias`,
      )
      .all(networkId)
      .map((row) => this.deserializeMember(row));
  }

  create(
    network: Omit<NetworkRecord, "id" | "createdAt">,
    members: NewNetworkMember[],
  ): NetworkRecord {
    const id = randomUUID();
    const db = this.sqlite.connection;
    db.transaction(() => {
      db.prepare(
        `INSERT INTO networks (id, name, proxyServerId, forwardingMode, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
      ).run(
        id,
        network.name,
        network.proxyServerId,
        network.forwardingMode,
        Date.now(),
      );
      this.insertMembers(id, members);
    })();
    return this.findById(id)!;
  }

  update(
    id: string,
    changes: Partial<Pick<NetworkRecord, "forwardingMode">>,
  ): void {
    if (changes.forwardingMode) {
      this.sqlite.connection
        .prepare("UPDATE networks SET forwardingMode = ? WHERE id = ?")
        .run(changes.forwardingMode, id);
    }
  }

  setMembers(networkId: string, members: NewNetworkMember[]): void {
    const db = this.sqlite.connection;
    db.transaction(() => {
      db.prepare("DELETE FROM network_members WHERE networkId = ?").run(
        networkId,
      );
      this.insertMembers(networkId, members);
    })();
  }

  delete(id: string): boolean {
    return (
      this.sqlite.connection
        .prepare("DELETE FROM networks WHERE id = ?")
        .run(id).changes > 0
    );
  }

  private insertMembers(networkId: string, members: NewNetworkMember[]) {
    const insert = this.sqlite.connection.prepare(
      `INSERT INTO network_members (serverId, networkId, alias, tryOrder)
       VALUES (?, ?, ?, ?)`,
    );
    for (const member of members) {
      insert.run(member.serverId, networkId, member.alias, member.tryOrder);
    }
  }

  private deserialize(row: any): NetworkRecord {
    return {
      id: String(row.id),
      name: String(row.name),
      proxyServerId: String(row.proxyServerId),
      forwardingMode: String(row.forwardingMode) as ForwardingMode,
      createdAt: Number(row.createdAt),
    };
  }

  private deserializeMember(row: any): NetworkMemberRecord {
    return {
      networkId: String(row.networkId),
      serverId: String(row.serverId),
      alias: String(row.alias),
      tryOrder: row.tryOrder === null ? null : Number(row.tryOrder),
    };
  }
}
