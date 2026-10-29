import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { StatusDot } from "@/shared/ui/status-dot";
import { toneClass, type Tone } from "@/shared/ui/tone";
import type { IInstanceLog } from "@shared/types/server/instance.types";
import { ServerStatus } from "@shared/types/server/server.types";
import type { ReactNode } from "react";

type Translate = (key: string, ...args: unknown[]) => string;

export interface KubekEvent {
  content: ReactNode;
  details: [label: string, value: ReactNode][];
}

const statusBadge: Record<ServerStatus, "success" | "secondary" | "warning" | "destructive"> = {
  [ServerStatus.RUNNING]: "success",
  [ServerStatus.STOPPED]: "secondary",
  [ServerStatus.STARTING]: "warning",
  [ServerStatus.STOPPING]: "warning",
  [ServerStatus.CRASHED]: "destructive",
};

const exactTime = (timestamp: string) => new Date(timestamp).toLocaleString();

/** Readable line and tooltip details for events Kubek writes into the console */
export function describeKubekEvent(log: IInstanceLog, t: Translate, accent: Tone): KubekEvent | null {
  const event = log.data;
  if (!event) return null;
  const time: [string, ReactNode] = [t("events.details.time"), exactTime(log.timestamp)];
  const user = (name: string | undefined) => (
    <b className={cn("font-semibold text-tone", toneClass[accent])}>{name || t("events.unknownUser")}</b>
  );
  const mono = (value: ReactNode) => <span className="font-mono">{value}</span>;
  const muted = (text: string) => <span className="text-muted-foreground">{text}</span>;

  switch (event.type) {
    case "user_input":
      return {
        content: (
          <>
            {user(event.username)} {muted(t("events.executed"))} <span className="font-medium text-c-green">{event.command}</span>
          </>
        ),
        details: [[t("events.details.user"), event.username || "—"], [t("events.details.id"), mono(event.id || "—")], time],
      };
    case "status_change":
      return {
        content: (
          <>
            {muted(t("events.statusChanged"))}{" "}
            <Badge variant={statusBadge[event.status]} className="h-[18px] align-[1px] font-sans">
              <StatusDot status={event.status} className="size-1.5" />
              {t(`status.${event.status}`)}
            </Badge>
          </>
        ),
        details: [[t("events.details.status"), t(`status.${event.status}`)], time],
      };
    case "stop":
      return {
        content: (
          <span className="text-muted-foreground">
            {t("events.stopped", event.exitCode)}
          </span>
        ),
        details: [
          [t("events.details.cause"), t(`events.causes.${event.causedBy}`)],
          [t("events.details.exitCode"), mono(event.exitCode)],
          time,
        ],
      };
    case "restart_failed":
      return {
        content: <span className="font-medium text-danger">{t("events.restartFailed", event.attempts)}</span>,
        details: [[t("events.details.attempts"), event.attempts], time],
      };
    case "bot_control":
      return {
        content: (
          <>
            {user(event.username)} {muted(t("events.telegramControl"))} <span className="font-medium text-c-green">{event.action}</span>
          </>
        ),
        details: [
          [t("events.details.user"), event.username || "—"],
          [t("events.details.telegramId"), mono(event.telegramId || "—")],
          [t("events.details.action"), event.action],
          time,
        ],
      };
  }
}

/** Plain text version for the downloaded log */
export function kubekEventText(log: IInstanceLog, t: Translate): string {
  const event = log.data;
  if (!event) return "";
  switch (event.type) {
    case "user_input":
      return `${event.username} ${t("events.executed")} ${event.command}`;
    case "status_change":
      return `${t("events.statusChanged")} ${t(`status.${event.status}`)}`;
    case "stop":
      return t("events.stopped", event.exitCode);
    case "restart_failed":
      return t("events.restartFailed", event.attempts);
    case "bot_control":
      return `${event.username} ${t("events.telegramControl")} ${event.action}`;
  }
}
