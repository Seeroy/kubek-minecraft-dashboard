import { AuditLogService } from "@/modules/audit-log/audit-log.service";
import { AuditAction } from "@shared/types/audit.types";
import { ExtensionKvRepository } from "@/modules/database/repositories/extension-kv.repository";
import { PermissionRegistry } from "@/modules/permissions/permission-registry.service";
import { ServersService } from "@/modules/servers/servers.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import type {
  Capability,
  ExtCommand,
  ExtEventName,
  ExtHttpApi,
  ExtRoute,
  ExtServersApi,
  ExtUser,
  KubekExtensionContext,
  SettingField,
} from "@kubekpanel/extension-sdk";
import { Injectable, Logger } from "@nestjs/common";
import { isLegacyPermission } from "@shared/access/legacy";
import { existsSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { ExtensionEventBus } from "../extension-event-bus.service";
import { CONFIG_KEY, withDefaults } from "../extension-settings";
import type { ExtensionRecord } from "../extensions.types";
import { CapabilityDeniedError } from "../extensions.types";
import { createOutboundHttpApi } from "./http.api";
import { createExtAudit, type ExtAudit } from "./ext-audit";
import { createProcessesApi } from "./processes.api";
import { createServersControlApi, createServersReadApi } from "./servers.api";
import { createStorageApi } from "./storage.api";
import { createTasksApi } from "./tasks.api";

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
    private readonly auditLog: AuditLogService,
    private readonly tasks: TasksService,
  ) {}

  build(record: ExtensionRecord, sinks: ContextSinks): KubekExtensionContext {
    const extId = record.id;
    const granted = new Set<Capability>(record.grantedCapabilities);
    const has = (cap: Capability) => granted.has(cap);
    const dataDir = join(EXT_DATA_ROOT, extId);
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });

    const logger = new Logger(`ext:${extId}`);
    const audit = createExtAudit(this.auditLog, {
      id: extId,
      name: record.manifest.name,
    });

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
        on: (event: string, handler: (payload: any) => void) => {
          // Extensions talk to each other on ext.*, that needs no capability
          if (event.startsWith("ext.")) {
            const off = this.bus.onCustom(event, handler, extId);
            sinks.dispose.push(off);
            return off;
          }
          const cap = Object.hasOwn(EVENT_CAPABILITY, event)
            ? EVENT_CAPABILITY[event as ExtEventName]
            : undefined;
          if (!cap) throw new Error(`Unknown event "${event}"`);
          if (!has(cap)) throw new CapabilityDeniedError(cap, extId);
          const off = this.bus.on(event as ExtEventName, handler, extId);
          sinks.dispose.push(off);
          return off;
        },
        emit: (event: string, payload: unknown) => {
          // Core events come from the panel only
          if (typeof event !== "string" || !event.startsWith("ext."))
            throw new Error(`Extension events must start with "ext.", got "${event}"`);
          this.bus.emitCustom(event, payload);
        },
      },
      servers: this.buildServersApi(extId, has, audit, sinks),
      http: this.buildHttpApi(extId, has, sinks),
      permissions: {
        has: (user: ExtUser, key: string) =>
          Boolean(user.isAdmin) ||
          ((isLegacyPermission(key) || this.permissions.has(key)) &&
            user.permissions.includes(key)),
      },
      storage: has("storage")
        ? createStorageApi(extId, this.kv)
        : {
            get: this.deny("storage", extId),
            set: this.deny("storage", extId),
            delete: this.deny("storage", extId),
            keys: this.deny("storage", extId),
          },
      config: this.buildConfigApi(extId, has, audit, record.manifest.settingsSchema),
      tasks: has("tasks")
        ? createTasksApi(
            this.tasks,
            { id: extId, name: record.manifest.name },
            (id) => this.servers.findById(id)?.name,
          )
        : { create: this.deny("tasks", extId), update: this.deny("tasks", extId) },
      commands: {
        register: (cmd) => {
          if (!has("commands"))
            throw new CapabilityDeniedError("commands", extId);
          sinks.registerCommand(extId, cmd);
        },
      },
      processes: has("process:spawn")
        ? createProcessesApi(dataDir, sinks.dispose, audit)
        : { spawn: this.deny("process:spawn", extId) },
    };
  }

  private buildServersApi(
    extId: string,
    has: (c: Capability) => boolean,
    audit: ExtAudit,
    sinks: ContextSinks,
  ): ExtServersApi {
    const read = has("servers:read")
      ? createServersReadApi(this.servers, this.bus)
      : null;
    // Log lines are what events:logs guards, servers:read alone is not enough
    const onLog: ExtServersApi["onLog"] = (id, cb) => {
      if (!read) throw new CapabilityDeniedError("servers:read", extId);
      if (!has("events:logs")) throw new CapabilityDeniedError("events:logs", extId);
      const off = read.onLog(id, cb);
      sinks.dispose.push(off);
      return off;
    };
    const control = has("servers:control")
      ? createServersControlApi(this.servers, audit)
      : null;
    return {
      list: read ? read.list : this.deny("servers:read", extId),
      get: read ? read.get : this.deny("servers:read", extId),
      onLog,
      ports: read ? read.ports : this.deny("servers:read", extId),
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

  private buildConfigApi(
    extId: string,
    has: (c: Capability) => boolean,
    audit: ExtAudit,
    schema: SettingField[] | undefined,
  ) {
    if (!has("settings")) {
      return {
        get: this.deny("settings", extId),
        set: this.deny("settings", extId),
        all: this.deny("settings", extId),
      };
    }
    const read = () => this.kv.get<Record<string, unknown>>(extId, CONFIG_KEY) ?? {};
    return {
      get: <T = unknown>(key: string) => withDefaults(schema, read())[key] as T,
      set: (key: string, value: unknown) => {
        this.kv.set(extId, CONFIG_KEY, { ...read(), [key]: value });
        // Values may be secrets, the journal names the setting only
        audit({ action: AuditAction.EXTENSION_CONFIG, details: { key } });
      },
      all: () => withDefaults(schema, read()),
    };
  }

  /** A stub for an ungranted capability family; throwing keeps the denial explicit */
  private deny(cap: Capability, extId: string): () => never {
    return () => {
      throw new CapabilityDeniedError(cap, extId);
    };
  }
}
