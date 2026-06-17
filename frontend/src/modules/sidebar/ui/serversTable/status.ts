import type { Server, ServerStatusData } from "@/modules/server";
import { ServerStatus } from "@shared/types/server/server.types";

export const STATUS_TEXT_CLASS: Record<string, string> = {
  [ServerStatus.RUNNING]: "text-emerald-500 dark:text-emerald-400",
  [ServerStatus.STOPPED]: "text-rose-500 dark:text-rose-400",
  [ServerStatus.STARTING]: "text-amber-500 dark:text-amber-400",
  [ServerStatus.STOPPING]: "text-orange-500 dark:text-orange-400",
  crashed: "text-red-500 dark:text-red-400",
};

export const STATUS_DOT_CLASS: Record<string, string> = {
  [ServerStatus.RUNNING]: "bg-emerald-500",
  [ServerStatus.STOPPED]: "bg-rose-500",
  [ServerStatus.STARTING]: "bg-amber-500 animate-pulse",
  [ServerStatus.STOPPING]: "bg-orange-500 animate-pulse",
  crashed: "bg-red-500",
};

export function resolveStatus(
  server: Server,
  statuses: Record<string, ServerStatusData>
): ServerStatus {
  return (
    ((statuses[server.id]?.status ?? server.status) as ServerStatus) ||
    ServerStatus.STOPPED
  );
}
