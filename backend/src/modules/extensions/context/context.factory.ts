import { ExtensionKvRepository } from "@/modules/database/repositories/extension-kv.repository";
import { PermissionRegistry } from "@/modules/permissions/permission-registry.service";
import { ServersService } from "@/modules/servers/servers.service";
import type {
  Capability,
  ExtCommand,
  ExtEventName,
  ExtHttpApi,
  ExtRoute,
  ExtServersApi,
  ExtTasksApi,
  ExtUser,
  KubekExtensionContext,
} from "@kubekpanel/extension-sdk";
import { Injectable, Logger } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { ExtensionEventBus } from "../extension-event-bus.service";
import type { ExtensionRecord } from "../extensions.types";
import { CapabilityDeniedError } from "../extensions.types";
import { createOutboundHttpApi } from "./http.api";
import { createServersControlApi, createServersReadApi } from "./servers.api";
import { createStorageApi } from "./storage.api";

const EXT_DATA_ROOT = resolve("extensions", ".data");

/** Maps each bus event to the capability that unlocks subscribing to it */
const EVENT_CAPABILITY: Record<ExtEventName, Capability> = {
  "server.created": "events:server",
  "server.started": "events:server",
  "server.running": "events:server",
  "server.stopped": "events:server",
  "server.crashed": "events:server",
  "server.error": "events:server",
  "server.deleted": "events:server",
  "server.log": "events:logs",
  "task.created": "events:tasks",
  "task.completed": "events:tasks",
  "backup.created": "events:backups",
  "player.joined": "events:players",
  "player.left": "events:players",
  "user.login": "events:auth",
  "file.changed": "events:files",
};

/** Sinks the manager passes in to collect runtime registrations for later dispatch */
export interface ContextSinks {
  /** unsubscribers/teardown collected for disable */
  dispose: Array<() => void>;
  registerRoutes(extId: string, routes: ExtRoute[]): void;
  registerCommand(extId: string, cmd: ExtCommand): void;
}

/**
 * Builds a capability-gated KubekExtensionContext
 */
@Injectable()
export class ContextFactory {
  constructor(
    private readonly bus: ExtensionEventBus,
    private readonly servers: ServersService,
    private readonly permissions: PermissionRegistry,
    private readonly kv: ExtensionKvRepository,
  ) {}

  build(record: ExtensionRecord, sinks: ContextSinks): KubekExtensionContext {
    const extId = record.id;
    const granted = new Set<Capability>(record.grantedCapabilities);
    const has = (cap: Capability) => granted.has(cap);
    const dataDir = join(EXT_DATA_ROOT, extId);
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

    const logger = new Logger(`ext:${extId}`);

    return {
      id: extId,
      version: record.version,
      dataDir,
      logger: {
        info: (msg, meta) =>
          logger.log(meta ? `${msg} ${JSON.stringify(meta)}` : msg),
        warn: (msg, meta) =>
          logger.warn(meta ? `${msg} ${JSON.stringify(meta)}` : msg),
        error: (msg, meta) =>
          logger.error(meta ? `${msg} ${JSON.stringify(meta)}` : msg),
      },
      events: {
        on: (event, handler) => {
          const cap = EVENT_CAPABILITY[event];
          if (!has(cap)) throw new CapabilityDeniedError(cap, extId);
          const off = this.bus.on(event, handler);
          sinks.dispose.push(off);
          return off;
        },
        emit: (event, payload) => this.bus.emitCustom(event, payload),
      },
      servers: this.buildServersApi(extId, has),
      http: this.buildHttpApi(extId, has, sinks),
      permissions: {
        has: (user: ExtUser, key: string) =>
          Boolean(user.isAdmin) ||
          (this.permissions.has(key) && user.permissions.includes(key)),
      },
      storage: has("storage")
        ? createStorageApi(extId, this.kv)
        : {
            get: this.deny("storage", extId),
            set: this.deny("storage", extId),
            delete: this.deny("storage", extId),
            keys: this.deny("storage", extId),
          },
      config: this.buildConfigApi(extId, has),
      tasks: this.buildTasksApi(extId, has, logger),
      commands: {
        register: (cmd) => {
          if (!has("commands"))
            throw new CapabilityDeniedError("commands", extId);
          sinks.registerCommand(extId, cmd);
        },
      },
    };
  }

  private buildServersApi(
    extId: string,
    has: (c: Capability) => boolean,
  ): ExtServersApi {
    const read = has("servers:read")
      ? createServersReadApi(this.servers, this.bus)
      : null;
    const control = has("servers:control")
      ? createServersControlApi(this.servers)
      : null;
    return {
      list: read ? read.list : this.deny("servers:read", extId),
      get: read ? read.get : this.deny("servers:read", extId),
      onLog: read ? read.onLog : this.deny("servers:read", extId),
      sendCommand: control
        ? control.sendCommand
        : this.deny("servers:control", extId),
      start: control ? control.start : this.deny("servers:control", extId),
      stop: control ? control.stop : this.deny("servers:control", extId),
    };
  }

  private buildHttpApi(
    extId: string,
    has: (c: Capability) => boolean,
    sinks: ContextSinks,
  ): ExtHttpApi {
    const outbound = has("http:outbound") ? createOutboundHttpApi() : null;
    return {
      fetch: outbound ? outbound.fetch : this.deny("http:outbound", extId),
      post: outbound ? outbound.post : this.deny("http:outbound", extId),
      registerRoutes: has("http:routes")
        ? (routes) => sinks.registerRoutes(extId, routes)
        : this.deny("http:routes", extId),
    };
  }

  private buildConfigApi(extId: string, has: (c: Capability) => boolean) {
    if (!has("settings")) {
      return {
        get: this.deny("settings", extId),
        set: this.deny("settings", extId),
        all: this.deny("settings", extId),
      };
    }
    const KEY = "__config__";
    const read = () => this.kv.get<Record<string, unknown>>(extId, KEY) ?? {};
    return {
      get: <T = unknown>(key: string) => read()[key] as T,
      set: (key: string, value: unknown) =>
        this.kv.set(extId, KEY, { ...read(), [key]: value }),
      all: () => read(),
    };
  }

  private buildTasksApi(
    extId: string,
    has: (c: Capability) => boolean,
    logger: Logger,
  ): ExtTasksApi {
    if (!has("tasks")) {
      return {
        create: this.deny("tasks", extId),
        update: this.deny("tasks", extId),
      };
    }
    // Lightweight task ids for extension-owned work
    return {
      create: (type, _payload) => {
        const id = randomUUID();
        logger.log(`task ${id} (${type})`);
        return id;
      },
      update: (taskId, patch) =>
        logger.log(`task ${taskId} ${JSON.stringify(patch)}`),
    };
  }

  /** A stub for an ungranted capability family; throwing keeps the denial explicit */
  private deny(cap: Capability, extId: string): () => never {
    return () => {
      throw new CapabilityDeniedError(cap, extId);
    };
  }
}
