"use client";

import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { iconType } from "@/modules/server-types/lib/blueprint";
import { authHttp } from "@/shared/lib/http";
import { cn } from "@/shared/lib/cn";
import { qk } from "@/shared/queries/query-keys";
import { BlueprintIcon } from "@/shared/ui/BlueprintIcon";
import { useQuery } from "@tanstack/react-query";
import { Server as ServerIcon } from "lucide-react";
import { useServerStore } from "../contexts/server-context";

// A data URL compares by value, so a refetch of the same file doesn't re-render
function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// 404 means the owner hasn't set an icon, the core icon shows instead
async function fetchServerIcon(serverId: string): Promise<string | null> {
  try {
    const blob = await authHttp.raw.get(`servers/${serverId}/icon`).blob();
    return await toDataUrl(blob);
  } catch {
    return null;
  }
}

export function ServerAvatar({
  serverId,
  name,
  className,
}: {
  serverId: string;
  name?: string;
  className?: string;
}) {
  const { servers } = useServerStore();
  const blueprintId = servers.find((s) => s.id === serverId)?.blueprintId;
  const blueprint = useBlueprint(blueprintId);
  const { data: src } = useQuery({
    queryKey: qk.servers.icon(serverId),
    queryFn: () => fetchServerIcon(serverId),
    // server-icon.png can be swapped by hand, the server answers 304 when it wasn't
    staleTime: 60_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  const classes = cn(
    "grid size-7 shrink-0 place-items-center overflow-hidden rounded-md bg-secondary text-muted-foreground",
    className
  );

  if (src) {
    // Server icons are 64x64 pixel art
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name ?? ""} className={cn(classes, "object-cover [image-rendering:pixelated]")} />;
  }

  const core = blueprintId ? iconType(blueprintId) : "custom";
  if (core !== "custom") {
    return <BlueprintIcon icon={blueprint?.icon} coreType={core} label={name ?? blueprint?.name ?? ""} className={classes} />;
  }

  return (
    <span className={classes} aria-hidden>
      <ServerIcon className="size-[55%]" />
    </span>
  );
}
