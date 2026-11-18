import { AppEventsService } from "@/core/events/app-events.service";
import { beforeEach, describe, expect, test } from "bun:test";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { ToolRegistryService } from "@/modules/assistant/tools/tool-registry.service";
import {
  defineTool,
  type ToolGroup,
} from "@/modules/assistant/tools/tool.types";
import { ConfigService } from "@/modules/config/config.service";
import { AuditLogsRepository } from "@/modules/database/repositories/audit-logs.repository";
import { ConfigRepository } from "@/modules/database/repositories/config.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import type { ServersService } from "@/modules/servers/servers.service";
import { fake } from "@/testing/fake";
import { sqliteProvider } from "@/testing/sqlite";
import { testUser } from "@/testing/user";
import { AccessArea } from "@shared/access/areas";
import type { IUser } from "@shared/types/user.types";
import { z } from "zod";
import { McpService } from "./mcp.service";

const group: ToolGroup = {
  tools: () => [
    defineTool({
      name: "ping",
      description: "Answers pong",
      kind: "read",
      access: [AccessArea.MONITORING, "read"],
      serverScoped: false,
      args: z.object({ text: z.string() }),
      run: (_ctx, { text }) => Promise.resolve({ content: `pong ${text}` }),
    }),
    defineTool({
      name: "reset",
      description: "Resets something",
      kind: "write",
      access: [AccessArea.PANEL, "manage"],
      serverScoped: false,
      args: z.object({}),
      run: () => Promise.resolve({ content: "done" }),
    }),
  ],
};

let mcp: McpService;
let audit: AuditLogsRepository;

const keyUser = (mcpOn: boolean): IUser =>
  testUser("alice", {
    grants: { [AccessArea.MONITORING]: "read" },
    apiKey: { id: "k1", name: "claude", mcp: mcpOn },
  });

async function connect(user: IUser): Promise<Client> {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const caller = { user, ip: "10.0.0.5", userAgent: "node" };
  await mcp.createServer(() => caller).connect(serverSide);
  const client = new Client({ name: "claude-code", version: "2.1.0" });
  await client.connect(clientSide);
  return client;
}

beforeEach(() => {
  const sqlite = sqliteProvider();
  const servers = new ServersRepository(sqlite);
  audit = new AuditLogsRepository(sqlite);
  const users = new UsersRepository(sqlite);
  users.create(testUser("alice"));
  users.create(testUser("root"));
  const registry = new ToolRegistryService(
    [group],
    fake<ServersService>({ findById: () => null }),
    new AuditLogService(audit, servers),
  );
  registry.onModuleInit();
  mcp = new McpService(
    registry,
    new ConfigService(new ConfigRepository(sqlite)),
    new AppEventsService(),
  );
});

describe("McpService", () => {
  test("off by default, then only for keys that allow it", () => {
    expect(() => mcp.assertAllowed(keyUser(true))).toThrow("turned off");
    mcp.setEnabled(true);
    expect(() => mcp.assertAllowed(keyUser(true))).not.toThrow();
    expect(() => mcp.assertAllowed(keyUser(false))).toThrow("this key");
    expect(() => mcp.assertAllowed(testUser("alice"))).toThrow("this key");
  });

  test("lists only the tools the key can run", async () => {
    const client = await connect(keyUser(true));
    const { tools } = await client.listTools();

    expect(tools.map((t) => t.name)).toEqual(["ping"]);
    expect(tools[0].annotations?.readOnlyHint).toBe(true);
    expect(tools[0].inputSchema.properties).toHaveProperty("text");
  });

  test("runs a tool and checks its arguments", async () => {
    const client = await connect(keyUser(true));

    const ok = await client.callTool({
      name: "ping",
      arguments: { text: "hi" },
    });
    expect(ok.content).toEqual([{ type: "text", text: "pong hi" }]);

    const bad = await client.callTool({ name: "ping", arguments: {} });
    expect(bad.isError).toBe(true);

    const denied = await client.callTool({ name: "reset", arguments: {} });
    expect(denied.isError).toBe(true);
  });

  test("write calls land in the audit log as mcp with the key", async () => {
    const admin = testUser("root", {
      grants: { [AccessArea.PANEL]: "manage" },
      apiKey: { id: "k2", name: "agent", mcp: true },
    });
    const client = await connect(admin);
    await client.callTool({ name: "reset", arguments: {} });

    const [entry] = audit.query({ source: "mcp" }).items;
    expect(entry.apiKeyId).toBe("k2");
    expect(entry.apiKeyName).toBe("agent");
    expect(entry.details).toMatchObject({ tool: "reset" });
    // The client from initialize names the agent, not the HTTP library
    expect(entry.userAgent).toBe("claude-code/2.1.0");
    expect(entry.ip).toBe("10.0.0.5");
  });
});
