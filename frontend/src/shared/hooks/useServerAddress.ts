"use client";
import { api } from "@/api";
import { hasServerProperties } from "@/shared/lib/serverRestrictions";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { qk } from "@/shared/queries/query-keys";
import { useQuery } from "@tanstack/react-query";

export interface ServerAddressEntry {
  label: "public" | "local";
  host: string;
  port: string | null;
  full: string;
}

export interface ServerAddressInfo {
  loading: boolean;
  port: string | null;
  publicEntry: ServerAddressEntry | null;
  localEntries: ServerAddressEntry[];
  /** Convenience: first available entry (public preferred), or null */
  primary: ServerAddressEntry | null;
}

// Port and interfaces rarely change
const STALE_MS = 5 * 60 * 1000;

function buildEntry(
  label: ServerAddressEntry["label"],
  host: string,
  port: string | null
): ServerAddressEntry {
  return {
    label,
    host,
    port,
    full: port ? `${host}:${port}` : host,
  };
}

export function useServerAddress(
  serverId?: string | null,
  blueprint?: BlueprintSummary
): ServerAddressInfo {
  // Proxies have no server.properties, the port lives elsewhere
  const withProperties = !!serverId && !!blueprint && hasServerProperties(blueprint);

  // Same cache as the settings form, so saving server.properties updates the port
  const propertiesQuery = useQuery({
    queryKey: qk.servers.properties(serverId ?? ""),
    queryFn: () => api.servers.getProperties(serverId!),
    enabled: withProperties,
    select: (props) => props?.["server-port"]?.toString().trim() || null,
    staleTime: STALE_MS,
    retry: false,
    meta: { silent: true },
  });
  const networkQuery = useQuery({
    queryKey: qk.systemMonitoring.network(),
    queryFn: () => api.systemMonitoring.getNetworkInfo(),
    staleTime: STALE_MS,
    retry: false,
    meta: { silent: true },
  });

  const port = (serverId && propertiesQuery.data) || null;
  const network = networkQuery.data;

  const publicEntry = network?.publicIp
    ? buildEntry("public", network.publicIp, port)
    : null;

  const localEntries = (network?.privateIps ?? []).map((ip) =>
    buildEntry("local", ip, port)
  );

  const primary = publicEntry || localEntries[0] || null;

  return {
    loading: networkQuery.isLoading || propertiesQuery.isLoading,
    port,
    publicEntry,
    localEntries,
    primary,
  };
}
