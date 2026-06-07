"use client";
import type { MetricsWindow } from "@/modules/system-monitoring/types";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import React from "react";

interface Props {
  value: MetricsWindow;
  onChange: (v: MetricsWindow) => void;
  className?: string;
}

const OPTIONS: MetricsWindow[] = ["now", "1h", "6h", "12h", "24h"];

const TimeRangeSelector: React.FC<Props> = ({ value, onChange, className }) => {
  const { t } = useTranslation("modules.systemMonitoring");

  return (
    <div
      className={cn(
        "inline-flex rounded-lg border border-border bg-card p-0.5",
        className
      )}
    >
      {OPTIONS.map((opt) => (
        <Button
          key={opt}
          variant={value === opt ? "default" : "ghost"}
          size="xs"
          onClick={() => onChange(opt)}
          className="rounded-md"
        >
          {t(`window.${opt}`, opt)}
        </Button>
      ))}
    </div>
  );
};

export default TimeRangeSelector;
