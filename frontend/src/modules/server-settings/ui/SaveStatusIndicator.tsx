import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Check, Loader2, X } from "lucide-react";

export type SaveStatus = "idle" | "saving" | "success" | "error";

interface SaveStatusIndicatorProps {
  status: SaveStatus;
  className?: string;
}

export const SaveStatusIndicator = ({
  status,
  className,
}: SaveStatusIndicatorProps) => {
  const { t } = useTranslation("modules.serverSettings");

  if (status === "idle") {
    return null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 text-sm transition-all duration-200",
        status === "saving" && "text-muted-foreground",
        status === "success" && "text-green-600 dark:text-green-500",
        status === "error" && "text-red-600 dark:text-red-500",
        className
      )}
    >
      {status === "saving" && (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t("status.saving")}</span>
        </>
      )}
      {status === "success" && (
        <>
          <Check className="h-4 w-4" />
          <span>{t("status.saved")}</span>
        </>
      )}
      {status === "error" && (
        <>
          <X className="h-4 w-4" />
          <span>{t("status.error")}</span>
        </>
      )}
    </div>
  );
};
