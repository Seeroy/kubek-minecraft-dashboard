import { canAccessServer } from "@/core/utils/serverAccess";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { AccessArea } from "@shared/access/areas";
import { can } from "@shared/access/can";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import {
  type ForwardingMode,
  NEW_BACKEND_REF,
  NetworkErrorCode,
  type NetworkWizardProps,
  type NewServerOptions,
  type VelocitySettings,
} from "@shared/types/network.types";
import type { IServer } from "@shared/types/server/server.types";
import type { IUser } from "@shared/types/user.types";
import {
  commonMode,
  forwardingFor,
  VELOCITY_BLUEPRINT_ID,
} from "../forwarding/forwarding-registry";
import { NetworkContextService } from "../network-context.service";
import { NetworkPortsService } from "../network-ports.service";
import { aliasFor } from "../plan/network-naming";

const PROXY_PORT = 25577;
const MAX_NEW_BACKENDS = 10;

export interface NewServerSpec {
  ref: string;
  name: string;
  blueprintId: string;
  version: string;
  port: number;
  memory?: number;
  runtime?: "native" | "docker";
  jvmArgs?: string;
  alias: string;
  tryOrder: number | null;
}

export interface ExistingBackendSpec {
  server: IServer;
  alias: string;
  tryOrder: number | null;
}

/** Validated wizard input with ports, aliases and the forwarding mode settled */
export interface WizardSpec {
  name: string;
  mode: ForwardingMode;
  /** Backends that cannot do modern forwarding pushed the network to legacy */
  legacyBecause: string[];
  proxy: { server: IServer } | { create: NewServerSpec };
  existing: ExistingBackendSpec[];
  created: NewServerSpec[];
  proxySettings: Partial<VelocitySettings>;
}

function invalid(code: NetworkErrorCode | undefined, message: string) {
  return new BadRequestException(code ? { code, message } : message);
}

@Injectable()
export class WizardSpecService {
  constructor(
    private readonly servers: ServersRepository,
    private readonly context: NetworkContextService,
    private readonly ports: NetworkPortsService,
  ) {}

  async resolve(props: NetworkWizardProps, user: IUser): Promise<WizardSpec> {
    const name = props.name.trim();
    if (!name) throw invalid(undefined, "Name is required");
    if (!!props.proxyServerId === !!props.newProxy) {
      throw invalid(undefined, "Pick an existing proxy or describe a new one");
    }
    if (
      (props.newProxy || props.newBackends?.length) &&
      !this.canCreate(user)
    ) {
      throw new ForbiddenException("Creating servers is not allowed");
    }

    const existingProxy = props.proxyServerId
      ? this.existingProxy(props.proxyServerId, user)
      : undefined;
    const backends = this.existingBackends(props, user);
    const fresh = this.newBackends(props);
    const order = this.tryOrder(props, backends, fresh.length);
    const mode = this.mode(props, backends);

    this.assertNames([
      ...(props.newProxy ? [props.newProxy.name] : []),
      ...fresh.map((b) => b.name),
    ]);
    const [proxyPort, ...ports] = await this.allocatePorts(
      props.newProxy,
      fresh,
    );
    const aliases: string[] = [];
    const take = (serverName: string) => {
      const alias = aliasFor(serverName, aliases);
      aliases.push(alias);
      return alias;
    };

    const proxy: WizardSpec["proxy"] = existingProxy
      ? { server: existingProxy }
      : {
          create: {
            ...this.newSpec("proxy", props.newProxy!, proxyPort),
            blueprintId: VELOCITY_BLUEPRINT_ID,
            alias: "",
            tryOrder: null,
          },
        };

    return {
      name,
      mode: mode.mode,
      legacyBecause: mode.legacyBecause,
      proxy,
      existing: backends.map((server) => ({
        server,
        alias: take(server.name),
        tryOrder: order.get(server.id) ?? null,
      })),
      created: fresh.map((backend, i) => {
        const ref = `${NEW_BACKEND_REF}${i}`;
        return {
          ...this.newSpec(ref, backend, ports[i]),
          blueprintId: backend.blueprintId,
          alias: take(backend.name.trim()),
          tryOrder: order.get(ref) ?? null,
        };
      }),
      proxySettings: props.proxySettings ?? {},
    };
  }

  private canCreate(user: IUser): boolean {
    return can(user, AccessArea.SERVERS, "write");
  }

  private accessible(serverId: string, user: IUser): IServer {
    if (!canAccessServer(user, serverId)) {
      throw new ForbiddenException(`Access to server ${serverId} denied`);
    }
    const server = this.context.requireServer(serverId);
    this.context.assertFree(serverId);
    return server;
  }

  private existingProxy(serverId: string, user: IUser): IServer {
    const server = this.accessible(serverId, user);
    this.context.assertProxy(server);
    return server;
  }

  private existingBackends(props: NetworkWizardProps, user: IUser): IServer[] {
    const ids = [...new Set(props.backendIds)];
    if (props.proxyServerId && ids.includes(props.proxyServerId)) {
      throw invalid(
        NetworkErrorCode.BACKEND_UNSUPPORTED,
        "The proxy cannot be its own backend",
      );
    }
    return ids.map((id) => {
      const server = this.accessible(id, user);
      this.context.forwardingOf(server.blueprintId, server.name);
      return server;
    });
  }

  private newBackends(props: NetworkWizardProps) {
    const list = props.newBackends ?? [];
    if (!list.length && !props.backendIds.length)
      throw invalid(undefined, "A network needs at least one backend");
    if (list.length > MAX_NEW_BACKENDS) {
      throw invalid(undefined, `Create at most ${MAX_NEW_BACKENDS} servers`);
    }
    for (const backend of list) {
      if (!forwardingFor(backend.blueprintId)) {
        throw invalid(
          NetworkErrorCode.BACKEND_UNSUPPORTED,
          `${backend.name} cannot run behind Velocity`,
        );
      }
    }
    return list;
  }

  // Missing order puts the first backend first
  private tryOrder(
    props: NetworkWizardProps,
    backends: IServer[],
    count: number,
  ): Map<string, number> {
    const known = new Set([
      ...backends.map((server) => server.id),
      ...Array.from({ length: count }, (_, i) => `${NEW_BACKEND_REF}${i}`),
    ]);
    const refs = props.tryOrder.length
      ? props.tryOrder
      : [backends[0]?.id ?? `${NEW_BACKEND_REF}0`];
    if (new Set(refs).size !== refs.length || refs.some((r) => !known.has(r))) {
      throw invalid(
        NetworkErrorCode.ORDER_INVALID,
        "Try order names an unknown server",
      );
    }
    return new Map(refs.map((r, index) => [r, index]));
  }

  private mode(props: NetworkWizardProps, backends: IServer[]) {
    const entries = backends.map((server) => {
      const version = server.variables?.GAME_VERSION;
      return {
        name: server.name,
        modes: forwardingFor(server.blueprintId)!.modes(
          version ? String(version) : undefined,
        ),
      };
    });
    for (const backend of props.newBackends ?? []) {
      entries.push({
        name: backend.name.trim(),
        modes: forwardingFor(backend.blueprintId)!.modes(backend.version),
      });
    }
    const mode = commonMode(
      entries.map((e) => e.modes),
      props.forwardingMode,
    );
    if (!mode) {
      throw invalid(
        NetworkErrorCode.MODE_CONFLICT,
        "These backends share no forwarding mode",
      );
    }
    const legacyBecause =
      mode === "legacy" && !props.forwardingMode
        ? entries.filter((e) => !e.modes.includes("modern")).map((e) => e.name)
        : [];
    return { mode, legacyBecause };
  }

  // Names of new servers are unique among themselves and the panel
  private assertNames(names: string[]): void {
    const seen = new Set<string>();
    for (const raw of names) {
      const name = raw.trim();
      if (!name) throw invalid(undefined, "Name is required");
      const key = name.toLowerCase();
      if (seen.has(key) || this.servers.findByName(name)) {
        throw invalid(NetworkErrorCode.NAME_TAKEN, name);
      }
      seen.add(key);
    }
  }

  // Chosen ports are checked, the rest is picked around them
  private async allocatePorts(
    newProxy: NewServerOptions | undefined,
    backends: NewServerOptions[],
  ): Promise<number[]> {
    const used = await this.ports.usedPorts();
    const chosen: number[] = [];
    for (const port of [newProxy?.port, ...backends.map((b) => b.port)]) {
      if (port === undefined) continue;
      if (used.has(port) || chosen.includes(port)) {
        throw invalid(NetworkErrorCode.PORT_TAKEN, String(port));
      }
      chosen.push(port);
    }

    let proxyPort = newProxy?.port ?? 0;
    if (newProxy && !newProxy.port) {
      [proxyPort] = await this.ports.allocate(1, PROXY_PORT, chosen);
    }
    const auto = await this.ports.allocate(
      backends.filter((b) => !b.port).length,
      undefined,
      [...chosen, proxyPort],
    );
    return [proxyPort, ...backends.map((b) => b.port ?? auto.shift()!)];
  }

  private newSpec(ref: string, options: NewServerOptions, port: number) {
    return {
      ref,
      name: options.name.trim(),
      version: options.version,
      port,
      memory: options.memory,
      runtime: options.runtime,
      jvmArgs: options.jvmArgs?.trim() || undefined,
    };
  }
}
