import { describe, expect, it } from "bun:test";
import { userWith } from "@/testing/user";
import { AccessArea } from "@shared/access/areas";
import { z } from "zod";
import { denyReason, hasToolAccess } from "./tool-access";
import { type ToolAccess, defineTool } from "./tool.types";

const toolWith = (access: ToolAccess, serverScoped = true) =>
  defineTool({
    name: "t",
    description: "t",
    kind: "read",
    access,
    serverScoped,
    args: z.object({ serverId: z.string() }),
    run: () => Promise.resolve({ content: "" }),
  });

const readFile = toolWith([AccessArea.FILES, "read"]);
const writeFile = toolWith([AccessArea.FILES, "write"]);
const getServer = toolWith("serverView");
const exists = () => true;

describe("hasToolAccess", () => {
  it("offers a read tool to a user with the read level", () => {
    const user = userWith({ [AccessArea.FILES]: "read" });
    expect(hasToolAccess(user, readFile)).toBe(true);
    expect(hasToolAccess(user, writeFile)).toBe(false);
  });

  it("offers a write tool to a user with manage in the area", () => {
    const user = userWith({ [AccessArea.FILES]: "manage" });
    expect(hasToolAccess(user, writeFile)).toBe(true);
  });

  it("offers a server view tool to a user with read in any server area", () => {
    expect(
      hasToolAccess(userWith({ [AccessArea.BACKUPS]: "read" }), getServer),
    ).toBe(true);
    expect(
      hasToolAccess(userWith({ [AccessArea.JAVA]: "manage" }), getServer),
    ).toBe(false);
  });
});

describe("denyReason", () => {
  const restricted = userWith(
    { [AccessArea.FILES]: "write" },
    { serversRestrict: { enabled: true, allowed: ["a"] } },
  );

  it("names the missing area and level", () => {
    const user = userWith({ [AccessArea.FILES]: "read" });
    expect(denyReason(user, writeFile, { serverId: "a" }, exists)).toBe(
      "Missing access files write",
    );
  });

  it("allows a server from the user's list", () => {
    expect(
      denyReason(restricted, writeFile, { serverId: "a" }, exists),
    ).toBeNull();
  });

  it("hides a server outside the user's list", () => {
    expect(denyReason(restricted, writeFile, { serverId: "b" }, exists)).toBe(
      "Server not found, call list_servers for valid ids",
    );
  });

  it("hides a server that does not exist", () => {
    const user = userWith({ [AccessArea.FILES]: "read" });
    expect(denyReason(user, readFile, { serverId: "a" }, () => false)).toBe(
      "Server not found, call list_servers for valid ids",
    );
  });

  it("lets an admin run any tool on any server", () => {
    const admin = userWith(
      {},
      { isAdmin: true, serversRestrict: { enabled: true, allowed: [] } },
    );
    expect(denyReason(admin, writeFile, { serverId: "b" }, exists)).toBeNull();
  });
});
