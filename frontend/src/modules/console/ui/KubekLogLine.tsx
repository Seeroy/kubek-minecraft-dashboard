import { ServerStatusIndicator } from "@/modules/server";
import { IInstanceLog } from "@shared/types/server/instance.types";
import { ServerStatus } from "@shared/types/server/server.types";
import React from "react";
import { useTranslation } from "../../../shared/hooks/useTranslation";
import RowWithTooltip from "./RowWithTooltip";

type TFn = (key: string, ...args: any[]) => string;

interface KubekLogLineProps {
  data: IInstanceLog;
}

function formatTimestamp(timestamp: string | undefined, t: TFn): string {
  if (!timestamp) return t("kubekLogLine.notSpecified");
  try {
    const date = new Date(timestamp);
    return date.toLocaleString("ru-RU", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return timestamp;
  }
}

const LogBadge = ({ isTelegram, t }: { isTelegram: boolean; t: TFn }) => (
  <span
    className={`inline-flex items-center rounded border-2 px-1 text-xs font-bold shadow-sm ${
      isTelegram
        ? "border-blue-600 bg-gradient-to-r from-blue-500 to-blue-600 text-white dark:border-blue-700 dark:from-blue-600 dark:to-blue-700"
        : "border-purple-600 bg-gradient-to-r from-purple-500 to-purple-600 text-white dark:border-purple-700 dark:from-purple-600 dark:to-purple-700"
    }`}
  >
    {isTelegram
      ? t("kubekLogLine.badges.telegram")
      : t("kubekLogLine.badges.kubek")}
  </span>
);

const LogRowContent = ({
  timestamp,
  t,
  children,
}: {
  timestamp?: string;
  t: TFn;
  children: React.ReactNode;
}) => (
  <div className="flex items-start gap-2">
    <div className="flex-shrink-0">
      <span className="text-gray-500 dark:text-gray-400">
        [{formatTimestamp(timestamp, t).split(", ")[1]}]
      </span>
    </div>
    <div className="flex flex-wrap items-center gap-1">{children}</div>
  </div>
);

const TooltipGrid = ({ children }: { children: React.ReactNode }) => (
  <div className="grid grid-cols-1 gap-2 text-sm">{children}</div>
);

const TooltipRow = ({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) => (
  <div className="flex items-center justify-between">
    <span className="font-medium text-gray-500 dark:text-gray-400">
      {label}
    </span>
    <span className="max-w-[200px] text-right break-words">{value}</span>
  </div>
);

const KubekLogLine: React.FC<KubekLogLineProps> = ({ data }) => {
  const { t } = useTranslation("modules.console");
  if (data.type !== "kubek" && data.type !== "telegram") return null;

  const kubekData = data.data;
  if (!kubekData) return null;

  const isTelegram = data.type === "telegram";

  switch (kubekData.type) {
    case "user_input":
      return (
        <RowWithTooltip
          rowContent={
            <LogRowContent timestamp={data.timestamp} t={t}>
              <LogBadge isTelegram={isTelegram} t={t} />
              <span className="ml-1 dark:text-gray-200">
                <span className="font-semibold text-purple-700 dark:text-purple-300">
                  {kubekData.username || t("kubekLogLine.unknownUser")}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {t("kubekLogLine.userInput.executedCommand")}
                </span>
                <span className="font-medium text-green-700 dark:text-green-300">
                  {kubekData.command}
                </span>
              </span>
            </LogRowContent>
          }
          tooltipContent={
            <TooltipGrid>
              <TooltipRow
                label={t("kubekLogLine.userInput.labels.user")}
                value={
                  <span className="font-semibold text-foreground">
                    {kubekData.username || t("kubekLogLine.notSpecified")}
                  </span>
                }
              />
              <TooltipRow
                label={t("kubekLogLine.userInput.labels.id")}
                value={
                  <span className="font-mono text-purple-600 dark:text-purple-400">
                    {kubekData.id || t("kubekLogLine.notSpecified")}
                  </span>
                }
              />
              <TooltipRow
                label={t("kubekLogLine.userInput.labels.exactTime")}
                value={
                  <span className="font-mono text-xs leading-tight text-blue-600 dark:text-blue-400">
                    {formatTimestamp(data.timestamp, t)}
                  </span>
                }
              />
            </TooltipGrid>
          }
        />
      );

    case "status_change": {
      const statusData = kubekData as {
        type: "status_change";
        status: ServerStatus;
      };
      return (
        <RowWithTooltip
          rowContent={
            <LogRowContent timestamp={data.timestamp} t={t}>
              <LogBadge isTelegram={isTelegram} t={t} />
              <span className="ml-1 inline-flex items-center justify-center dark:text-gray-200">
                <span className="text-gray-600 dark:text-gray-400">
                  {t("kubekLogLine.statusChange.statusChanged")}
                </span>
                <ServerStatusIndicator
                  status={statusData.status}
                  size={"sm"}
                  variant={"badge"}
                />
              </span>
            </LogRowContent>
          }
          tooltipContent={
            <TooltipGrid>
              <TooltipRow
                label={t("kubekLogLine.statusChange.labels.status")}
                value={
                  <ServerStatusIndicator
                    status={statusData.status}
                    size={"sm"}
                    variant={"badge"}
                  />
                }
              />
              <TooltipRow
                label={t("kubekLogLine.statusChange.labels.exactTime")}
                value={
                  <span className="font-mono text-xs leading-tight text-blue-600 dark:text-blue-400">
                    {formatTimestamp(data.timestamp, t)}
                  </span>
                }
              />
            </TooltipGrid>
          }
        />
      );
    }

    case "stop": {
      const stopData = kubekData as {
        type: "stop";
        exitCode: number;
        causedBy: "killed" | "crashed";
      };
      return (
        <RowWithTooltip
          rowContent={
            <LogRowContent timestamp={data.timestamp} t={t}>
              <LogBadge isTelegram={isTelegram} t={t} />
              <span className="ml-1 dark:text-gray-200">
                <span className="text-gray-600 dark:text-gray-400">
                  {t("kubekLogLine.stop.serverStopped")}
                </span>
                <span className="font-mono text-gray-600 dark:text-gray-400">
                  {t("kubekLogLine.stop.exitCode")}
                  {stopData.exitCode})
                </span>
              </span>
            </LogRowContent>
          }
          tooltipContent={
            <TooltipGrid>
              <TooltipRow
                label={t("kubekLogLine.stop.labels.cause")}
                value={
                  <span className="font-semibold">{stopData.causedBy}</span>
                }
              />
              <TooltipRow
                label={t("kubekLogLine.stop.labels.exitCode")}
                value={
                  <span className="font-mono text-gray-700 dark:text-gray-300">
                    {stopData.exitCode}
                  </span>
                }
              />
              <TooltipRow
                label={t("kubekLogLine.stop.labels.exactTime")}
                value={
                  <span className="font-mono text-xs leading-tight text-blue-600 dark:text-blue-400">
                    {formatTimestamp(data.timestamp, t)}
                  </span>
                }
              />
            </TooltipGrid>
          }
        />
      );
    }

    case "restart_failed": {
      const restartData = kubekData as {
        type: "restart_failed";
        attempts: number;
      };
      return (
        <RowWithTooltip
          rowContent={
            <LogRowContent timestamp={data.timestamp} t={t}>
              <LogBadge isTelegram={isTelegram} t={t} />
              <span className="ml-1 dark:text-gray-200">
                <span className="text-gray-600 dark:text-gray-400">
                  {t("kubekLogLine.restartFailed.failedToRestart")}
                </span>
                <span className="font-semibold text-red-700 dark:text-red-300">
                  {restartData.attempts}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {t("kubekLogLine.restartFailed.attempts")}
                </span>
              </span>
            </LogRowContent>
          }
          tooltipContent={
            <TooltipGrid>
              <TooltipRow
                label={t("kubekLogLine.restartFailed.labels.attempts")}
                value={
                  <span className="font-semibold text-red-700 dark:text-red-300">
                    {restartData.attempts}
                  </span>
                }
              />
              <TooltipRow
                label={t("kubekLogLine.restartFailed.labels.exactTime")}
                value={
                  <span className="font-mono text-xs leading-tight text-blue-600 dark:text-blue-400">
                    {formatTimestamp(data.timestamp, t)}
                  </span>
                }
              />
            </TooltipGrid>
          }
        />
      );
    }

    case "bot_control": {
      const botData = kubekData as {
        type: "bot_control";
        action: "start" | "stop" | "restart";
        userId: string;
        username: string;
        telegramId: number;
      };
      return (
        <RowWithTooltip
          rowContent={
            <LogRowContent timestamp={data.timestamp} t={t}>
              <LogBadge isTelegram={isTelegram} t={t} />
              <span className="ml-1 dark:text-gray-200">
                <span className="font-semibold text-blue-700 dark:text-blue-300">
                  {botData.username || t("kubekLogLine.unknownUser")}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {t("kubekLogLine.botControl.controlledViaTelegram")}
                </span>
                <span className="font-medium text-green-700 dark:text-green-300">
                  {botData.action}
                </span>
              </span>
            </LogRowContent>
          }
          tooltipContent={
            <TooltipGrid>
              <TooltipRow
                label={t("kubekLogLine.botControl.labels.user")}
                value={
                  <span className="font-semibold text-foreground">
                    {botData.username || t("kubekLogLine.notSpecified")}
                  </span>
                }
              />
              <TooltipRow
                label={t("kubekLogLine.botControl.labels.userId")}
                value={
                  <span className="font-mono text-purple-600 dark:text-purple-400">
                    {botData.userId || t("kubekLogLine.notSpecified")}
                  </span>
                }
              />
              <TooltipRow
                label={t("kubekLogLine.botControl.labels.telegramId")}
                value={
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    {botData.telegramId || t("kubekLogLine.notSpecified")}
                  </span>
                }
              />
              <TooltipRow
                label={t("kubekLogLine.botControl.labels.action")}
                value={
                  <span className="font-semibold text-green-700 dark:text-green-300">
                    {botData.action}
                  </span>
                }
              />
              <TooltipRow
                label={t("kubekLogLine.botControl.labels.exactTime")}
                value={
                  <span className="font-mono text-xs leading-tight text-blue-600 dark:text-blue-400">
                    {formatTimestamp(data.timestamp, t)}
                  </span>
                }
              />
            </TooltipGrid>
          }
        />
      );
    }
  }

  return null;
};

export default React.memo(KubekLogLine);
