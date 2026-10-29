import { describe, expect, it } from "bun:test";
import { AccessArea } from "@shared/access/areas";
import {
  javaForMinecraft,
  mapPermissions,
  mapServer,
  mapUser,
} from "./legacy-mappers";

describe("mapPermissions", () => {
  it("turns Kubek 3 permissions into personal levels", () => {
    const { grants, isAdmin } = mapPermissions([
      "monitor_servers",
      "file_manager",
      "unknown",
    ]);
    expect(isAdmin).toBe(false);
    expect(grants).toEqual({
      [AccessArea.CONSOLE]: "read",
      [AccessArea.POWER]: "read",
      [AccessArea.PLAYERS]: "read",
      [AccessArea.NETWORKS]: "read",
      [AccessArea.FILES]: "manage",
    });
  });

  it("makes an account with accounts and settings an admin with backups", () => {
    const { grants, isAdmin } = mapPermissions(["accounts", "kubek_settings"]);
    expect(isAdmin).toBe(true);
    expect(grants[AccessArea.BACKUPS]).toBe("manage");
    expect(grants[AccessArea.ACCOUNTS]).toBe("write");
  });
});

describe("mapUser", () => {
  it("imports a user with grants, no roles and the remapped server list", () => {
    const user = mapUser(
      {
        permissions: ["manage_servers"],
        serversAccessRestricted: true,
        serversAllowed: ["Lobby", "Gone"],
      },
      "steve",
      "id-1",
      "hash",
      new Map([["Lobby", "srv-1"]]),
    );
    expect(user.roles).toEqual([]);
    expect(user.extPermissions).toEqual([]);
    expect(user.grants[AccessArea.POWER]).toBe("manage");
    expect(user.grants[AccessArea.SETTINGS]).toBe("manage");
    expect(user.serversRestrict).toEqual({ enabled: true, allowed: ["srv-1"] });
    expect(user.isAdmin).toBe(false);
  });
});

describe("mapServer", () => {
  it("keeps the game version and picks Java for an old paper jar", () => {
    const server = mapServer({}, "Old", "paper-1.12.2.jar", ["-Xmx1G"]);
    expect(server.blueprintId).toBe("com.kubek.paper");
    expect(server.variables).toEqual({
      XMX: 1024,
      GAME_VERSION: "1.12.2",
      JAVA_VERSION: 8,
    });
  });

  it("imports BeamMP as a custom jar", () => {
    const server = mapServer({}, "Cars", "beammp-3.1.0.jar", []);
    expect(server.blueprintId).toBe("com.kubek.custom");
    expect(server.variables.GAME_VERSION).toBeUndefined();
  });

  it("leaves proxy Java on the default", () => {
    const server = mapServer({}, "Proxy", "velocity-3.3.0.jar", []);
    expect(server.variables).toEqual({ XMX: 2048, GAME_VERSION: "3.3.0" });
  });
});

describe("javaForMinecraft", () => {
  it.each([
    ["1.8.9", 8],
    ["1.16.5", 8],
    ["1.17.1", 16],
    ["1.18.2", 17],
    ["1.20.4", 17],
    ["1.20.5", 21],
    ["1.21.4", 21],
    ["26.1", 25],
  ])("%s needs Java %d", (version, java) => {
    expect(javaForMinecraft(version)).toBe(java);
  });
});
