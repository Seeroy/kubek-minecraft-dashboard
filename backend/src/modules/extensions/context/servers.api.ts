import type { ServersService } from "@/modules/servers/servers.service";
import type {
  ExtServersApi,
  ServerStatus,
  ServerSummary,
} from "@kubekpanel/extension-sdk";
import type { IServer } from "@shared/types/server/server.types";
import { AuditAction, AuditCategory, AuditResult } from "@shared/types/audit.types";
import type { ExtensionEventBus } from "../extension-event-bus.service";
import type { ExtAudit } from "./ext-audit";

/**
 * servers:read exposes list/get/onLog; servers:control adds sendCommand/start/stop. The factory
 * swaps in denied stubs for the family the extension was not granted
 */
export function createServersReadApi(
  servers: ServersService,
  bus: ExtensionEventBus,
): Pick<ExtServersApi, "list" | "get" | "onLog" | "ports"> {
  return {
    list: () => servers.findAll().map(toSummary),
    get: (id) => {
      const server = servers.findById(id);
      return server ? toSummary(server) : null;
    },
    onLog: (id, cb) =>
      bus.on("server.log", (p) => {
        if (p.serverId === id) cb(p.line);
      }),
    ports: async (id) =>
      servers.findById(id) ? servers.getInstance(id).resolvePorts() : [],
  };
}

// A line break would run the rest as a second command
export const oneLine = (cmd: string) => cmd.replace(/[\r\n]+/g, " ");

/** Runs a server action and writes it to the journal with its outcome */
async function audited<T>(
  audit: ExtAudit,
  action: (typeof AuditAction)[keyof typeof AuditAction],
  serverId: string,
  details: Record<string, unknown> | undefined,
  run: () => Promise<T>,
): Promise<T> {
  try {
    const result = await run();
    audit({
      action,
      category: AuditCategory.SERVER,
      serverId,
      details,
      result: result === false ? AuditResult.FAILED : AuditResult.SUCCESS,
    });
    return result;
  } catch (error) {
    audit({
      action,
      category: AuditCategory.SERVER,
      serverId,
      details,
      result: AuditResult.FAILED,
      error: String(error),
    });
    throw error;
  }
}

export function createServersControlApi(
  servers: ServersService,
  audit: ExtAudit = () => {},
): Pick<ExtServersApi, "sendCommand" | "start" | "stop"> {
  return {
    sendCommand: (id, cmd) =>
      audited(audit, AuditAction.EXTENSION_SERVER_COMMAND, id, { command: oneLine(cmd) }, async () => {
        const instance = servers.getInstance(id);
        return instance ? instance.input(oneLine(cmd)) : false;
      }),
    start: (id) =>
      audited(audit, AuditAction.EXTENSION_SERVER_START, id, undefined, async () => {
        await servers.start(id);
      }),
    stop: (id) =>
      audited(audit, AuditAction.EXTENSION_SERVER_STOP, id, undefined, async () => {
        const instance = servers.getInstance(id);
        if (instance) await instance.stop();
      }),
  };
}

function toSummary(server: IServer): ServerSummary {
  return {
    id: server.id,
    name: server.name,
    blueprintId: server.blueprintId ?? "",
    status: toStatus(server.status),
  };
}

function toStatus(status: string): ServerStatus {
  return status === "running" || status === "starting" || status === "stopping"
    ? status
    : "stopped";
}
