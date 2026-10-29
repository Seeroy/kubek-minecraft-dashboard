import {
  beforeEach,
  describe,
  expect,
  setSystemTime,
  test,
  afterEach,
} from "bun:test";
import { memoryDatabase, sqliteProvider } from "@/testing/sqlite";
import { ServerStatus } from "@shared/types/server/server.types";
import { NetworksRepository } from "./networks.repository";
import { ServersRepository } from "./servers.repository";

let networks: NetworksRepository;
let servers: ServersRepository;
let proxy: string;
let lobby: string;
let survival: string;

const addServer = (name: string) =>
  servers.create({
    name,
    status: ServerStatus.STOPPED,
    restartOnError: { enabled: false, attempts: 0 },
    blueprintId: "velocity",
    variables: {},
  }).id;

beforeEach(() => {
  setSystemTime(new Date(5000));
  const provider = sqliteProvider(memoryDatabase());
  networks = new NetworksRepository(provider);
  servers = new ServersRepository(provider);
  proxy = addServer("Proxy");
  lobby = addServer("Lobby");
  survival = addServer("Survival");
});

afterEach(() => {
  setSystemTime();
});

describe("NetworksRepository", () => {
  test("creates a network with its members", () => {
    const network = networks.create(
      { name: "Main", proxyServerId: proxy, forwardingMode: "modern" },
      [
        { serverId: lobby, alias: "lobby", tryOrder: 0 },
        { serverId: survival, alias: "survival", tryOrder: null },
      ],
    );

    expect(networks.findById(network.id)).toEqual({
      id: network.id,
      name: "Main",
      proxyServerId: proxy,
      forwardingMode: "modern",
      createdAt: 5000,
    });
    expect(networks.members(network.id)).toEqual([
      { networkId: network.id, serverId: lobby, alias: "lobby", tryOrder: 0 },
      {
        networkId: network.id,
        serverId: survival,
        alias: "survival",
        tryOrder: null,
      },
    ]);
  });

  test("members are ordered by try order, unordered ones last by alias", () => {
    const extra = addServer("Extra");
    const network = networks.create(
      { name: "Main", proxyServerId: proxy, forwardingMode: "modern" },
      [
        { serverId: survival, alias: "zeta", tryOrder: null },
        { serverId: extra, alias: "alpha", tryOrder: null },
        { serverId: lobby, alias: "lobby", tryOrder: 1 },
      ],
    );
    expect(networks.members(network.id).map((m) => m.alias)).toEqual([
      "lobby",
      "alpha",
      "zeta",
    ]);
  });

  test("finds the network of a proxy or a member server", () => {
    const network = networks.create(
      { name: "Main", proxyServerId: proxy, forwardingMode: "legacy" },
      [{ serverId: lobby, alias: "lobby", tryOrder: 0 }],
    );

    expect(networks.findByServer(proxy)?.id).toBe(network.id);
    expect(networks.findByServer(lobby)?.id).toBe(network.id);
    expect(networks.findByServer(survival)).toBeNull();
  });

  test("a bad member rolls back the whole network", () => {
    expect(() =>
      networks.create(
        { name: "Main", proxyServerId: proxy, forwardingMode: "modern" },
        [
          { serverId: lobby, alias: "same", tryOrder: 0 },
          { serverId: survival, alias: "same", tryOrder: 1 },
        ],
      ),
    ).toThrow("UNIQUE constraint failed");
    expect(networks.findAll()).toEqual([]);
    expect(networks.findByServer(lobby)).toBeNull();
  });

  test("a server belongs to one network and a proxy runs one network", () => {
    const otherProxy = addServer("Proxy2");
    networks.create(
      { name: "A", proxyServerId: proxy, forwardingMode: "modern" },
      [{ serverId: lobby, alias: "lobby", tryOrder: 0 }],
    );

    expect(() =>
      networks.create(
        { name: "B", proxyServerId: otherProxy, forwardingMode: "modern" },
        [{ serverId: lobby, alias: "lobby", tryOrder: 0 }],
      ),
    ).toThrow("UNIQUE constraint failed: network_members.serverId");
    expect(() =>
      networks.create(
        { name: "C", proxyServerId: proxy, forwardingMode: "modern" },
        [],
      ),
    ).toThrow("UNIQUE constraint failed: networks.proxyServerId");
  });

  test("try orders must be unique and not negative", () => {
    expect(() =>
      networks.create(
        { name: "A", proxyServerId: proxy, forwardingMode: "modern" },
        [
          { serverId: lobby, alias: "a", tryOrder: 0 },
          { serverId: survival, alias: "b", tryOrder: 0 },
        ],
      ),
    ).toThrow("UNIQUE constraint failed");
    expect(() =>
      networks.create(
        { name: "A", proxyServerId: proxy, forwardingMode: "modern" },
        [{ serverId: lobby, alias: "a", tryOrder: -1 }],
      ),
    ).toThrow("CHECK constraint failed");
  });

  test("setMembers replaces the member list", () => {
    const network = networks.create(
      { name: "Main", proxyServerId: proxy, forwardingMode: "modern" },
      [{ serverId: lobby, alias: "lobby", tryOrder: 0 }],
    );

    networks.setMembers(network.id, [
      { serverId: survival, alias: "smp", tryOrder: 0 },
    ]);

    expect(networks.members(network.id)).toEqual([
      { networkId: network.id, serverId: survival, alias: "smp", tryOrder: 0 },
    ]);
    expect(networks.findByServer(lobby)).toBeNull();
  });

  test("a failed setMembers keeps the old list", () => {
    const network = networks.create(
      { name: "Main", proxyServerId: proxy, forwardingMode: "modern" },
      [{ serverId: lobby, alias: "lobby", tryOrder: 0 }],
    );
    expect(() =>
      networks.setMembers(network.id, [
        { serverId: "ghost", alias: "ghost", tryOrder: 0 },
      ]),
    ).toThrow("FOREIGN KEY constraint failed");
    expect(networks.members(network.id).map((m) => m.serverId)).toEqual([
      lobby,
    ]);
  });

  test("update changes the forwarding mode only when given", () => {
    const network = networks.create(
      { name: "Main", proxyServerId: proxy, forwardingMode: "modern" },
      [],
    );
    networks.update(network.id, {});
    expect(networks.findById(network.id)?.forwardingMode).toBe("modern");
    networks.update(network.id, { forwardingMode: "legacy" });
    expect(networks.findById(network.id)?.forwardingMode).toBe("legacy");
  });

  test("lists networks in creation order", () => {
    const otherProxy = addServer("Proxy2");
    const first = networks.create(
      { name: "First", proxyServerId: proxy, forwardingMode: "modern" },
      [],
    );
    setSystemTime(new Date(6000));
    const second = networks.create(
      { name: "Second", proxyServerId: otherProxy, forwardingMode: "modern" },
      [],
    );
    expect(networks.findAll().map((n) => n.id)).toEqual([first.id, second.id]);
  });

  test("deleting a network frees its members", () => {
    const network = networks.create(
      { name: "Main", proxyServerId: proxy, forwardingMode: "modern" },
      [{ serverId: lobby, alias: "lobby", tryOrder: 0 }],
    );
    expect(networks.delete(network.id)).toBe(true);
    expect(networks.delete(network.id)).toBe(false);
    expect(networks.members(network.id)).toEqual([]);
    expect(servers.findById(lobby)?.name).toBe("Lobby");
  });

  test("deleting the proxy server deletes the network, deleting a member drops it", () => {
    const network = networks.create(
      { name: "Main", proxyServerId: proxy, forwardingMode: "modern" },
      [
        { serverId: lobby, alias: "lobby", tryOrder: 0 },
        { serverId: survival, alias: "smp", tryOrder: 1 },
      ],
    );

    servers.delete(lobby);
    expect(networks.members(network.id).map((m) => m.alias)).toEqual(["smp"]);

    servers.delete(proxy);
    expect(networks.findById(network.id)).toBeNull();
    expect(networks.findByServer(survival)).toBeNull();
  });
});
