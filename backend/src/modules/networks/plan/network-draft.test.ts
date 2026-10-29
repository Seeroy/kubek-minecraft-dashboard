import { describe, expect, test } from "bun:test";
import type { ServerFiles } from "../forwarding/backend-forwarding";
import { forwardingFor } from "../forwarding/forwarding-registry";
import {
  type DraftBackend,
  draftEdits,
  fileChanges,
  type NetworkDraft,
  needsRestart,
} from "./network-draft";

const files =
  (map: Record<string, Record<string, string>>) =>
  (server: { serverId: string | null }): ServerFiles => ({
    read: (path) => Promise.resolve(map[server.serverId ?? ""]?.[path] ?? null),
  });

const backend = (
  serverId: string | null,
  alias: string,
  tryOrder: number | null,
  running = false,
): DraftBackend => ({
  serverId,
  name: alias,
  blueprintId: "com.kubek.paper",
  gameVersion: "1.21.4",
  port: serverId === "b1" ? 25566 : 25567,
  running,
  alias,
  tryOrder,
  forwarding: forwardingFor("com.kubek.paper")!,
});

const draft = (docker = false): NetworkDraft => ({
  proxy: {
    serverId: "p",
    name: "proxy",
    blueprintId: "com.kubek.velocity",
    port: 25577,
    running: true,
    docker,
  },
  backends: [backend("b1", "lobby", 0, true), backend(null, "survival", null)],
  mode: "modern",
  secret: "topsecretvalue",
});

describe("draftEdits", () => {
  const fs = files({
    b1: { "server.properties": "online-mode=true\nmotd=x\n" },
  });

  test("writes a template for a proxy without config", async () => {
    const [proxy] = await draftEdits(draft(), [], fs);
    expect(proxy.edits.map((e) => e.path)).toEqual([
      "velocity.toml",
      "forwarding.secret",
    ]);
    const parsed = Bun.TOML.parse(proxy.edits[0].after) as Record<string, any>;
    expect(parsed.bind).toBe("0.0.0.0:25577");
    expect(parsed.servers).toEqual({
      lobby: "127.0.0.1:25566",
      survival: "127.0.0.1:25567",
      try: ["lobby"],
    });
  });

  test("docker proxies reach backends through the host", async () => {
    const [proxy] = await draftEdits(draft(true), [], fs);
    expect(proxy.edits[0].after).toContain(
      'lobby = "host.docker.internal:25566"',
    );
  });

  test("backends go offline mode and get the secret", async () => {
    const d = draft();
    const [, b1] = await draftEdits(d, [d.backends[0]], fs);
    expect(b1.edits.map((e) => e.path)).toEqual([
      "server.properties",
      "config/paper-global.yml",
    ]);
    expect(b1.edits[0].after).toBe("online-mode=false\nmotd=x\n");
  });

  test("a backend without server.properties gets its port", async () => {
    const d = draft();
    const [, b1] = await draftEdits(d, [d.backends[0]], files({}));
    expect(b1.edits[0].after).toBe("online-mode=false\nserver-port=25566\n");
  });

  test("review hides the secret and lists running servers", async () => {
    const d = draft();
    const edits = await draftEdits(d, [d.backends[0]], fs);
    const changes = fileChanges(edits, d.secret);
    expect(JSON.stringify(changes)).not.toContain(d.secret);
    expect(changes.find((c) => c.path === "forwarding.secret")?.kind).toBe(
      "create",
    );
    expect(needsRestart(edits)).toEqual(["p", "b1"]);
  });

  test("nothing to do when everything is in place", async () => {
    const d = draft();
    const first = await draftEdits(d, [d.backends[0]], fs);
    const written: Record<string, Record<string, string>> = {
      b1: { "server.properties": "online-mode=true\nmotd=x\n" },
      p: {},
    };
    for (const { server, edits } of first)
      for (const e of edits) written[server.serverId!][e.path] = e.after;
    expect(await draftEdits(d, [d.backends[0]], files(written))).toEqual([]);
  });
});
