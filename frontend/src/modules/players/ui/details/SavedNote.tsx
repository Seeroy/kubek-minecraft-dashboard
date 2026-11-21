"use client";
import type { PlayerDetails } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { formatRelative } from "@/shared/lib/formatRelative";
import { Radio, Save, SaveOff } from "lucide-react";
import type { ReactNode } from "react";

function Note({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return <p className="flex items-center gap-2 text-muted-foreground [&_svg]:size-3.5 [&_svg]:shrink-0">{icon}{children}</p>;
}

export function SavedNote({ details, online, live }: { details: PlayerDetails; online: boolean; live: boolean }) {
  const { t } = useTranslation("modules.players.details");
  if (live) return <Note icon={<Radio className="text-success" />}>{t("live")}</Note>;
  if (!details.savedAt) return <Note icon={<SaveOff />}>{t("noSave")}</Note>;
  const when = formatRelative(details.savedAt, t("justNow"));
  return <Note icon={<Save />}>{online ? t("savedOnline", when) : t("saved", when)}</Note>;
}
