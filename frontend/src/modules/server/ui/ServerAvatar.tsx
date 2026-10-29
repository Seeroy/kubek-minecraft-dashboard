"use client";

import { authHttp } from "@/shared/lib/http";
import { cn } from "@/shared/lib/cn";
import { qk } from "@/shared/queries/query-keys";
import { useQuery } from "@tanstack/react-query";
import { Server as ServerIcon } from "lucide-react";

// One fetch per server for every place the icon shows, URLs live as long as the tab
async function fetchServerIcon(serverId: string): Promise<string | null> {
  try {
    const blob = await authHttp.raw.get(`servers/${serverId}/icon`).blob();
    return URL.createObjectURL(blob);
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
  const { data: src } = useQuery({
    queryKey: qk.servers.icon(serverId),
    queryFn: () => fetchServerIcon(serverId),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  const classes = cn(
    "grid size-7 shrink-0 place-items-center overflow-hidden rounded-md bg-secondary text-muted-foreground [image-rendering:pixelated]",
    className
  );

  if (!src) {
    return (
      <span className={classes} aria-hidden>
        <ServerIcon className="size-[55%]" />
      </span>
    );
  }

  // Blob URL, next/image adds nothing here
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={name ?? ""} className={cn(classes, "object-cover")} />;
}
