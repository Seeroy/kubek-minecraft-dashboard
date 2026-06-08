import type { ServersService } from "@/modules/servers/servers.service";
import type {
  ExtServersApi,
  ServerStatus,
  ServerSummary,
} from "@kubekpanel/extension-sdk";
import type { IServer } from "@shared/types/server/server.types";
import type { ExtensionEventBus } from "../extension-event-bus.service";

/**
 * servers:read exposes list/get/onLog; servers:control adds sendCommand/start/stop. The factory
 * swaps in denied stubs for the family the extension was not granted
 */
export function createServersReadApi(
  servers: ServersService,
  bus: ExtensionEventBus,
): Pick<ExtServersApi, "list" | "get" | "onLog"> {
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
  };
}

export function createServersControlApi(
  servers: ServersService,
): Pick<ExtServersApi, "sendCommand" | "start" | "stop"> {
  return {
    sendCommand: async (id, cmd) => {
      const instance = servers.getInstance(id);
      return instance ? instance.input(cmd) : false;
    },
    start: async (id) => {
      await servers.start(id);
    },
    stop: async (id) => {
      const instance = servers.getInstance(id);
      if (instance) await instance.stop();
    },
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
