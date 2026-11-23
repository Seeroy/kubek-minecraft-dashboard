import { describe, expect, test } from "bun:test";
import type { ServersService } from "@/modules/servers/servers.service";
import { AuditAction, type AuditRecordInput, AuditResult } from "@shared/types/audit.types";
import { createExtAudit, extActor } from "./ext-audit";
import { createProcessesApi } from "./processes.api";
import { createServersControlApi } from "./servers.api";

function setup() {
  const entries: AuditRecordInput[] = [];
  const audit = createExtAudit({ record: (e) => entries.push(e) }, { id: "com.test.ext", name: "Test" });
  return { entries, audit };
}

const actor = { userId: "u1", username: "alice", ip: "10.0.0.1", userAgent: "ua" };

describe("createExtAudit", () => {
  test("goes to the extension outside a request", () => {
    const { entries, audit } = setup();
    audit({ action: AuditAction.EXTENSION_CONFIG, details: { key: "x" } });
    expect(entries[0]).toMatchObject({
      username: "Test",
      userId: null,
      source: "extension",
      resourceType: "extension",
      resourceId: "com.test.ext",
    });
  });

  test("goes to the user inside a route handler", async () => {
    const { entries, audit } = setup();
    await extActor.run(actor, async () => {
      await Promise.resolve();
      audit({ action: AuditAction.EXTENSION_ACTION });
    });
    expect(entries[0]).toMatchObject({ userId: "u1", username: "alice", ip: "10.0.0.1", source: "extension" });
  });
});

describe("audited server control", () => {
  test("records commands with the result", async () => {
    const { entries, audit } = setup();
    const servers = {
      getInstance: () => ({ input: (cmd: string) => cmd !== "fail" }),
    } as unknown as ServersService;
    const api = createServersControlApi(servers, audit);
    await api.sendCommand("s1", "say hi\nstop");
    await api.sendCommand("s1", "fail");
    expect(entries.map((e) => [e.action, e.serverId, e.details, e.result])).toEqual([
      [AuditAction.EXTENSION_SERVER_COMMAND, "s1", { command: "say hi stop" }, "success"],
      [AuditAction.EXTENSION_SERVER_COMMAND, "s1", { command: "fail" }, "failed"],
    ]);
  });
});

describe("audited processes", () => {
  test("records the program without its arguments", async () => {
    const { entries, audit } = setup();
    const proc = createProcessesApi(process.cwd(), [], audit).spawn({ command: "/bin/echo", args: ["secret-token"] });
    await proc.exited;
    expect(entries[0]?.details).toMatchObject({ command: "echo", cwd: "." });
    expect(JSON.stringify(entries[0])).not.toContain("secret-token");
  });

  test("records a program that could not start", () => {
    const { entries, audit } = setup();
    const api = createProcessesApi(process.cwd(), [], audit);
    expect(() => api.spawn({ command: "definitely-not-a-program-xyz" })).toThrow();
    expect(entries[0]?.result).toBe(AuditResult.FAILED);
  });
});
