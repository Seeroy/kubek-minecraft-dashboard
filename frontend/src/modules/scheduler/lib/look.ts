import type { Tone } from "@/shared/ui/tone";
import { ScheduledRunStatus, SchedulerActionType } from "@shared/types/scheduler.types";
import { Database, Globe, Play, RotateCw, Square, Terminal, type LucideIcon } from "lucide-react";

export const actionLook: Record<SchedulerActionType, { icon: LucideIcon; tone: Tone }> = {
  [SchedulerActionType.SERVER_START]: { icon: Play, tone: "green" },
  [SchedulerActionType.SERVER_STOP]: { icon: Square, tone: "red" },
  [SchedulerActionType.SERVER_RESTART]: { icon: RotateCw, tone: "cyan" },
  [SchedulerActionType.SERVER_COMMAND]: { icon: Terminal, tone: "purple" },
  [SchedulerActionType.BACKUP_CREATE]: { icon: Database, tone: "blue" },
  [SchedulerActionType.HTTP_WEBHOOK]: { icon: Globe, tone: "orange" },
};

export const runBadge: Record<ScheduledRunStatus, "success" | "destructive" | "info"> = {
  [ScheduledRunStatus.SUCCESS]: "success",
  [ScheduledRunStatus.FAILED]: "destructive",
  [ScheduledRunStatus.RUNNING]: "info",
};

const pad = (n: number) => String(n).padStart(2, "0");

/** Compact 20.10 14:05, the year rarely matters for a schedule */
export const shortDateTime = (timestamp: number) => {
  const d = new Date(timestamp);
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
