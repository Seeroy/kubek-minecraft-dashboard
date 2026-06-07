"use client";
import { api } from "@/api";
import type { NetworkInfo } from "@/api/system-monitoring/system-monitoring.model";
import { useEffect, useState } from "react";

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

const portCache = new Map<string, string | null>();
const portInflight = new Map<string, Promise<string | null>>();

let networkCache: { value: NetworkInfo; fetchedAt: number } | null = null;
let networkInflight: Promise<NetworkInfo> | null = null;
const NETWORK_TTL_MS = 5 * 60 * 1000;

async function resolvePort(serverId: string): Promise<string | null> {
  if (portCache.has(serverId)) return portCache.get(serverId)!;
  if (portInflight.has(serverId)) return portInflight.get(serverId)!;

  const promise = (async () => {
    try {
      const props = await api.servers.getProperties(serverId);
      const port = props?.["server-port"]?.toString().trim() || null;
      portCache.set(serverId, port);
      return port;
    } catch {
      portCache.set(serverId, null);
      return null;
    } finally {
      portInflight.delete(serverId);
    }
  })();

  portInflight.set(serverId, promise);
  return promise;
}

async function resolveNetwork(): Promise<NetworkInfo> {
  const now = Date.now();
  if (networkCache && now - networkCache.fetchedAt < NETWORK_TTL_MS) {
    return networkCache.value;
  }
  if (networkInflight) return networkInflight;

  networkInflight = (async () => {
    try {
      const info = await api.systemMonitoring.getNetworkInfo();
      networkCache = { value: info, fetchedAt: Date.now() };
      return info;
    } catch {
      const fallback: NetworkInfo = { publicIp: null, privateIps: [] };
      networkCache = { value: fallback, fetchedAt: Date.now() };
      return fallback;
    } finally {
      networkInflight = null;
    }
  })();

  return networkInflight;
}

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

export function useServerAddress(serverId?: string | null): ServerAddressInfo {
  const [port, setPort] = useState<string | null>(
    serverId ? (portCache.get(serverId) ?? null) : null
  );
  const [network, setNetwork] = useState<NetworkInfo | null>(
    networkCache?.value ?? null
  );
  const [loadingNetwork, setLoadingNetwork] = useState<boolean>(!networkCache);
  const [loadingPort, setLoadingPort] = useState<boolean>(
    !!serverId && !portCache.has(serverId)
  );

  useEffect(() => {
    let active = true;
    if (!networkCache) setLoadingNetwork(true);
    resolveNetwork().then((info) => {
      if (active) {
        setNetwork(info);
        setLoadingNetwork(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!serverId) {
      setPort(null);
      setLoadingPort(false);
      return;
    }
    let active = true;
    const cached = portCache.get(serverId);
    if (cached !== undefined) {
      setPort(cached);
      setLoadingPort(false);
    } else {
      setLoadingPort(true);
      resolvePort(serverId).then((p) => {
        if (active) {
          setPort(p);
          setLoadingPort(false);
        }
      });
    }
    return () => {
      active = false;
    };
  }, [serverId]);

  const publicEntry = network?.publicIp
    ? buildEntry("public", network.publicIp, port)
    : null;

  const localEntries = (network?.privateIps ?? []).map((ip) =>
    buildEntry("local", ip, port)
  );

  const primary = publicEntry || localEntries[0] || null;

  return {
    loading: loadingNetwork || loadingPort,
    port,
    publicEntry,
    localEntries,
    primary,
  };
}
