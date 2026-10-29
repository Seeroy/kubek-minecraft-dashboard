import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import type { ResolveScope } from "../server-types.types";
import type { PortBinding } from "./docker.runtime";

/**
 * Host address to publish on. Velocity backends go on loopback so players can't
 * skip the proxy, but not when the proxy is in docker too, it comes through
 * host.docker.internal and can't see loopback ports
 */
export function publishHostIp(
  serverId: string,
  network: { proxyServerId: string } | null,
  proxyRuntime: "native" | "docker" | undefined,
): string | undefined {
  if (!network || network.proxyServerId === serverId) return undefined;
  if (proxyRuntime === "docker") return undefined;
  return "127.0.0.1";
}

/** Map blueprint ports to docker host-port bindings, publishing host:container 1:1 */
export function buildPortBindings(
  ports: KubekBlueprintManifest["ports"],
  scope: ResolveScope,
  hostIp?: string,
): Record<string, PortBinding[]> {
  const out: Record<string, PortBinding[]> = {};
  for (const port of ports) {
    const value = scope[port.key] ?? port.default;
    const hostPort = String(value);
    const protocols =
      port.protocol === "tcp+udp" ? ["tcp", "udp"] : [port.protocol];
    for (const proto of protocols) {
      out[`${value}/${proto}`] = [
        hostIp
          ? { HostIp: hostIp, HostPort: hostPort }
          : { HostPort: hostPort },
      ];
    }
  }
  return out;
}
