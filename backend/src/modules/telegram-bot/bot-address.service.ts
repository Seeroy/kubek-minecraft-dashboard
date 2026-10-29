import { ServerTypesRegistry } from "@/modules/server-types/server-types-registry.service";
import { ServersService } from "@/modules/servers/servers.service";
import { SystemMonitoringService } from "@/modules/system-monitoring/system-monitoring.service";
import { Injectable } from "@nestjs/common";
import type { IServer } from "@shared/types/server/server.types";

/**
 * Address players join with, same logic as the panel sidebar
 */
@Injectable()
export class BotAddressService {
  constructor(
    private readonly servers: ServersService,
    private readonly registry: ServerTypesRegistry,
    private readonly network: SystemMonitoringService,
  ) {}

  /** host:port, or null when the public IP is unknown */
  async resolve(server: IServer): Promise<string | null> {
    const { publicIp } = await this.network.getNetworkInfo();
    if (!publicIp) return null;
    const port = await this.port(server);
    return port ? `${publicIp}:${port}` : publicIp;
  }

  // server.properties wins, otherwise the blueprint's primary port
  private async port(server: IServer): Promise<string | null> {
    try {
      const props = await this.servers.getServerProperties(server.id);
      const port = String(props["server-port"] ?? "").trim();
      if (port) return port;
    } catch {
      // not every server type has server.properties
    }

    const ports = this.registry.get(server.blueprintId)?.manifest.ports ?? [];
    const primary = ports.find((p) => p.primary) ?? ports[0];
    if (!primary) return null;
    return String(server.variables?.[primary.key] ?? primary.default);
  }
}
