import { describe, expect, it } from "bun:test";
import {
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { testUser, userWith } from "@/testing/user";
import { extActor } from "./context/ext-audit";
import { ExtensionCommands } from "./extension-commands.service";
import { ExtensionRegistry } from "./extension-registry.service";
import type { LoadedExtension } from "./extensions.types";

const actor = { userId: "u1", username: "alex", ip: null, userAgent: null };

function setup() {
  const registry = new ExtensionRegistry();
  registry.add({
    record: { id: "com.a.ext", manifest: { name: "Ext A" } },
  } as unknown as LoadedExtension);
  const ran: string[] = [];
  registry.addCommand("com.a.ext", {
    id: "open",
    title: "Open",
    icon: "Link",
    run: () => {
      ran.push(`open by ${extActor.getStore()?.username}`);
    },
  });
  registry.addCommand("com.a.ext", {
    id: "wipe",
    title: "Wipe",
    permission: "com.a.ext.wipe",
    run: () => {
      ran.push("wipe");
    },
  });
  registry.addCommand("com.a.ext", {
    id: "broken",
    title: "Broken",
    run: () => Promise.reject(new Error("no token")),
  });
  return { commands: new ExtensionCommands(registry), ran, registry };
}

describe("extension commands", () => {
  it("lists only what the user may run", () => {
    const { commands } = setup();
    const plain = userWith({});
    expect(commands.list(plain).map((c) => c.id)).toEqual(["open", "broken"]);
    expect(commands.list(plain)[0]).toEqual({
      extId: "com.a.ext",
      extName: "Ext A",
      id: "open",
      title: "Open",
      icon: "Link",
      permission: undefined,
    });
    const granted = userWith({}, { extPermissions: ["com.a.ext.wipe"] });
    expect(commands.list(granted).map((c) => c.id)).toEqual(["open", "wipe", "broken"]);
    const admin = testUser("a", { isAdmin: true });
    expect(commands.list(admin)).toHaveLength(3);
  });

  it("runs as the user who clicked", async () => {
    const { commands, ran } = setup();
    await commands.run("com.a.ext", "open", userWith({}), actor);
    expect(ran).toEqual(["open by alex"]);
  });

  it("unknown, forbidden and failing commands", async () => {
    const { commands, ran } = setup();
    await expect(commands.run("com.a.ext", "nope", userWith({}), actor)).rejects.toThrow(NotFoundException);
    await expect(commands.run("com.b.ext", "open", userWith({}), actor)).rejects.toThrow(NotFoundException);
    await expect(commands.run("com.a.ext", "wipe", userWith({}), actor)).rejects.toThrow(ForbiddenException);
    await expect(commands.run("com.a.ext", "broken", userWith({}), actor)).rejects.toThrow(
      new InternalServerErrorException("no token"),
    );
    expect(ran).toEqual([]);
  });

  it("a command registered again replaces the old one", () => {
    const { commands, registry } = setup();
    registry.addCommand("com.a.ext", { id: "open", title: "Open again", run: () => {} });
    const titles = commands.list(testUser("a", { isAdmin: true })).map((c) => c.title);
    expect(titles).toEqual(["Wipe", "Broken", "Open again"]);
  });
});
