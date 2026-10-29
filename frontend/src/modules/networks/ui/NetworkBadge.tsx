"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Network, Waypoints } from "lucide-react";
import { useNetworkOf } from "../api/networks.queries";

/** Which network a server list entry belongs to, nothing for standalone servers */
export function NetworkBadge({ serverId }: { serverId: string }) {
  const { t } = useTranslation("modules.networks.badge");
  const network = useNetworkOf(serverId).data;
  if (!network) return null;

  const proxy = network.proxy.serverId === serverId;
  const label = proxy ? t("proxy", network.name) : t("member", network.name);
  return (
    <Badge variant="outline" title={label} aria-label={label} className="max-w-36">
      {proxy ? <Waypoints /> : <Network />}
      <span className="truncate">{network.name}</span>
    </Badge>
  );
}
