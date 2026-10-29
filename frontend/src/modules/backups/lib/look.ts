import type { Tone } from "@/shared/ui/tone";
import { BackupStatus, BackupType } from "@shared/types/backup.types";
import { Archive, Layers, type LucideIcon } from "lucide-react";

export const typeLook: Record<BackupType, { icon: LucideIcon; tone: Tone }> = {
  [BackupType.FULL]: { icon: Archive, tone: "blue" },
  [BackupType.PARTIAL]: { icon: Layers, tone: "purple" },
};

export const statusBadge: Record<BackupStatus, "success" | "info" | "destructive" | "warning"> = {
  [BackupStatus.COMPLETED]: "success",
  [BackupStatus.CREATING]: "info",
  [BackupStatus.FAILED]: "destructive",
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Date and time parts in the panel's numeric style, 20.10.2026 and 14:05 */
export function dateParts(timestamp: number): [string, string] {
  const d = new Date(timestamp);
  return [`${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`, `${pad(d.getHours())}:${pad(d.getMinutes())}`];
}
