import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";
import { ServerStatus } from "@shared/types/server/server.types";

export interface ServerStatusProps {
  status: ServerStatus;
  size?: "sm" | "md" | "lg";
  variant?: "dot" | "badge";
  showLabel?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: {
    dot: "h-2 w-2",
    badge: "px-2 py-0.5 text-xs",
  },
  md: {
    dot: "h-3 w-3",
    badge: "px-2.5 py-0.5 text-sm",
  },
  lg: {
    dot: "h-4 w-4",
    badge: "px-3 py-1 text-base",
  },
};

const getStatusColor = (status: ServerStatus) => {
  switch (status) {
    case ServerStatus.RUNNING:
      return {
        dot: "bg-emerald-500",
        badge:
          "bg-emerald-500 text-white dark:bg-emerald-600 dark:text-white border-none",
      };
    case ServerStatus.STOPPED:
      return {
        dot: "bg-red-500",
        badge:
          "bg-red-500 text-white dark:bg-red-600 dark:text-white border-none",
      };
    case ServerStatus.STARTING:
      return {
        dot: "bg-amber-500 animate-pulse",
        badge:
          "bg-amber-500 text-white dark:bg-amber-600 dark:text-white border-none animate-pulse",
      };
    case ServerStatus.STOPPING:
      return {
        dot: "bg-amber-500 animate-pulse",
        badge:
          "bg-amber-500 text-white dark:bg-amber-600 dark:text-white border-none animate-pulse",
      };
    default:
      return {
        dot: "bg-muted",
        badge:
          "bg-gray-700 text-white dark:bg-gray-600 dark:text-white border-none",
      };
  }
};

export function ServerStatusIndicator({
  status,
  size = "md",
  variant = "dot",
  showLabel = false,
  className,
}: ServerStatusProps) {
  const { t } = useTranslation("modules.components");
  const colors = getStatusColor(status);
  const sizes = sizeClasses[size];

  const getStatusLabel = (status: ServerStatus) => {
    switch (status) {
      case ServerStatus.RUNNING:
        return t("serverStatus.running");
      case ServerStatus.STOPPED:
        return t("serverStatus.stopped");
      case ServerStatus.STARTING:
        return t("serverStatus.starting");
      case ServerStatus.STOPPING:
        return t("serverStatus.stopping");
      default:
        return "Unknown";
    }
  };

  if (variant === "dot") {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn("rounded-full", colors.dot, sizes.dot)} />
        {showLabel && (
          <span className="text-sm font-medium">{getStatusLabel(status)}</span>
        )}
      </div>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", colors.badge, sizes.badge, className)}
    >
      {getStatusLabel(status)}
    </Badge>
  );
}
