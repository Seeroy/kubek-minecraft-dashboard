"use client";
import type { Server } from "@/modules/server";
import { ServerAvatar } from "@/modules/server/ui/ServerAvatar";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Plate } from "@/shared/ui/plate";
import { Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { javaTone } from "../lib/java";

const VISIBLE_AVATARS = 4;

interface JavaRowProps {
  major: number | null;
  title: ReactNode;
  badges: ReactNode;
  meta: ReactNode;
  path?: string;
  usedBy: Server[];
  removing: boolean;
  /** Missing when the user may not remove it */
  onRemove?: () => void;
}

/** One Java installation: version plate, details, the servers on it and a remove button */
export function JavaRow({ major, title, badges, meta, path, usedBy, removing, onRemove }: JavaRowProps) {
  const { t } = useTranslation("modules.javaManager.installed");
  const blocked = usedBy.length > 0;

  return (
    <div className="grid grid-cols-[40px_minmax(0,1fr)_auto_auto] items-center gap-4 px-4 py-3 not-first:border-t not-first:border-border max-md:grid-cols-[40px_minmax(0,1fr)_auto]">
      <Plate tone={javaTone(major)} size="lg" className="size-10 text-sm font-bold">
        {major ?? "?"}
      </Plate>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <b className="text-[14px] font-semibold">{title}</b>
          {badges}
        </div>
        <div className="mt-0.5 flex flex-wrap gap-2.5 text-[12.5px] text-muted-foreground">{meta}</div>
        {path && (
          <div className="mt-0.5 truncate font-mono text-[11.5px] text-muted-foreground" title={path}>
            {path}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1.5 text-[12.5px] whitespace-nowrap text-muted-foreground max-md:hidden">
        {blocked ? (
          <>
            <span className="flex">
              {usedBy.slice(0, VISIBLE_AVATARS).map((server) => (
                <ServerAvatar
                  key={server.id}
                  serverId={server.id}
                  name={server.name}
                  className="-ml-1.5 size-5 rounded-[5px] ring-2 ring-card first:ml-0"
                />
              ))}
            </span>
            {t("usedBy", usedBy.length)}
          </>
        ) : (
          t("unused")
        )}
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          size="icon-sm"
          className="hover:bg-danger/10 hover:text-danger"
          disabled={removing || blocked}
          title={blocked ? t("inUse") : t("remove")}
          aria-label={t("remove")}
          onClick={onRemove}
        >
          <Trash2 />
        </Button>
      )}
    </div>
  );
}
