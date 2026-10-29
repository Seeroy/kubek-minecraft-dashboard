import { readPropertiesFile } from "@/core/properties/properties-file";
import { getRealServerPath } from "@/core/utils/serverPath";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import { BadRequestException, Injectable } from "@nestjs/common";
import { NetworkErrorCode } from "@shared/types/network.types";
import type { IServer } from "@shared/types/server/server.types";
import {
  VELOCITY_CONFIG,
  velocityBindPort,
} from "./config/velocity-configurator";
import { serverFiles } from "./network-files";
import { freePorts } from "./plan/network-naming";

const BACKEND_PORT_START = 25566;

/** Ports the panel servers listen on, as configured, not as probed */
@Injectable()
export class NetworkPortsService {
  constructor(
    private readonly servers: ServersRepository,
    private readonly registry: ServerTypesRegistry,
  ) {}

  /** Port players or the proxy connect to */
  async gamePort(server: IServer): Promise<number | null> {
    const fromFile = await this.filePort(server.id);
    return fromFile ?? this.declaredPorts(server)[0] ?? null;
  }

  async usedPorts(): Promise<Set<number>> {
    const used = new Set<number>();
    for (const server of this.servers.findAll()) {
      this.declaredPorts(server).forEach((port) => used.add(port));
      const fromFile = await this.filePort(server.id);
      if (fromFile) used.add(fromFile);
    }
    return used;
  }

  /** Free ports for new servers, the preferred one first when it is free */
  async allocate(
    count: number,
    preferred?: number,
    exclude: number[] = [],
  ): Promise<number[]> {
    if (count === 0) return [];
    const used = await this.usedPorts();
    exclude.forEach((port) => used.add(port));
    const out: number[] = [];
    if (preferred && !used.has(preferred)) {
      out.push(preferred);
      used.add(preferred);
    }
    out.push(...freePorts(used, count - out.length, BACKEND_PORT_START));
    if (out.length < count) {
      throw new BadRequestException({
        code: NetworkErrorCode.NO_FREE_PORT,
        message: "No free ports left",
      });
    }
    return out;
  }

  // Primary port first
  private declaredPorts(server: IServer): number[] {
    const ports = this.registry.get(server.blueprintId)?.manifest.ports ?? [];
    return [...ports]
      .sort((a, b) => Number(!!b.primary) - Number(!!a.primary))
      .map((port) => Number(server.variables?.[port.key] ?? port.default))
      .filter((port) => Number.isInteger(port) && port > 0);
  }

  private async filePort(serverId: string): Promise<number | null> {
    const velocity = await serverFiles(serverId).read(VELOCITY_CONFIG);
    if (velocity !== null) return velocityBindPort(velocity);
    try {
      const doc = await readPropertiesFile(
        await getRealServerPath(serverId, "server.properties"),
      );
      const port = Number(doc?.get("server-port"));
      return Number.isInteger(port) && port > 0 ? port : null;
    } catch {
      return null;
    }
  }
}
