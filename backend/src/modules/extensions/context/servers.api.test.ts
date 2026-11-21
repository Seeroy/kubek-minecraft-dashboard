import { describe, expect, it } from "bun:test";
import type { ServersService } from "@/modules/servers/servers.service";
import { createServersControlApi, oneLine } from "./servers.api";

describe("oneLine", () => {
  it("turns line breaks into spaces", () => {
    expect(oneLine("gamemode creative Steve\nop Alex\r\n")).toBe(
      "gamemode creative Steve op Alex ",
    );
  });

  it("keeps a plain command", () => {
    expect(oneLine("say hi")).toBe("say hi");
  });
});

describe("sendCommand", () => {
  it("sends one line to the instance", async () => {
    const sent: string[] = [];
    const servers = {
      getInstance: () => ({ input: (cmd: string) => sent.push(cmd) > 0 }),
    } as unknown as ServersService;

    await createServersControlApi(servers).sendCommand(
      "s1",
      "kick Steve\nop Alex",
    );
    expect(sent).toEqual(["kick Steve op Alex"]);
  });
});
