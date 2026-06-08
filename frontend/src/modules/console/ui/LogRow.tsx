import KubekLogLine from "@/modules/console/ui/KubekLogLine";
import AnsiText from "@/shared/ui/AnsiText";
import { IInstanceLog } from "@shared/types/server/instance.types";
import React from "react";
import { parseLog } from "../utils/parseLog";

interface LogRowProps {
  data: IInstanceLog;
}

const LEVEL_COLORS: Record<string, string> = {
  error:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  fatal:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
  warn: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  warning:
    "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
  info: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
};
const DEFAULT_LEVEL_COLOR =
  "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700";

const getLevelColor = (level: string) =>
  LEVEL_COLORS[level.toLowerCase()] ?? DEFAULT_LEVEL_COLOR;

const LogRow: React.FC<LogRowProps> = ({ data }) => {
  if (data.type === "kubek" || data.type === "telegram") {
    return <KubekLogLine data={data} />;
  }

  let { line = "" } = data;
  line = line.trim();

  const lineData = parseLog(line);
  if (!lineData.level || !lineData.time) {
    return (
      <div className="font-mono text-sm whitespace-pre-wrap">
        <AnsiText>{line}</AnsiText>
      </div>
    );
  }

  return (
    <div className="font-mono text-sm break-words whitespace-pre-wrap">
      <span className="text-gray-500 dark:text-gray-400">
        [{lineData.time}]
      </span>
      <span
        className={`mx-2 inline-flex items-center rounded border px-2 text-xs font-medium ${getLevelColor(
          lineData.level
        )}`}
      >
        {lineData.level.toUpperCase()}
      </span>
      <span className="dark:text-gray-200">
        <AnsiText>{lineData.message}</AnsiText>
      </span>
    </div>
  );
};

export default React.memo(LogRow);
