"use client";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import AnsiText from "@/shared/ui/AnsiText";
import type { CSSProperties } from "react";

const SIGNAL_BARS = [4, 6, 8, 10, 12];

/** The MOTD as it shows up in the Minecraft multiplayer list */
export function MotdPreview({ serverId, name, motd, maxPlayers }: { serverId: string; name: string; motd: string; maxPlayers: string }) {
  // server.properties keeps line breaks escaped
  const lines = motd.split(/\\n|\n/).slice(0, 2);

  return (
    <div className="flex items-center gap-3 rounded-lg bg-mc-list bg-[repeating-linear-gradient(45deg,transparent_0_6px,color-mix(in_oklch,var(--color-mc-f)_2.5%,transparent)_6px_12px)] p-3 font-mono text-[13px] text-mc-7">
      <ServerAvatar serverId={serverId} name={name} className="size-12 rounded-none" />
      <div className="min-w-0 flex-1 leading-snug">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-mc-f">{name}</span>
          <span className="flex shrink-0 items-end gap-2 text-mc-7">
            0/{maxPlayers || "20"}
            <span aria-hidden className="flex items-end gap-px">
              {SIGNAL_BARS.map((h) => (
                <i key={h} style={{ "--h": `${h}px` } as CSSProperties} className="block h-(--h) w-0.5 bg-mc-a" />
              ))}
            </span>
          </span>
        </div>
        {lines.map((line, i) => (
          <div key={i} className="truncate">
            <AnsiText className="text-[length:inherit]">{line || " "}</AnsiText>
          </div>
        ))}
      </div>
    </div>
  );
}
