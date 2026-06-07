import { api } from "@/api";
import type { Translator } from "@/locales/types";
import { ScheduleMode } from "@shared/types/scheduler.types";
import { useEffect, useState } from "react";

interface UseCronPreviewInput {
  mode: ScheduleMode;
  cronExpression: string;
  timezone: string;
  t: Translator;
}

/** Live cron preview */
export function useCronPreview({
  mode,
  cronExpression,
  timezone,
  t,
}: UseCronPreviewInput) {
  const [cronPreview, setCronPreview] = useState<string[]>([]);
  const [cronPreviewError, setCronPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (mode !== ScheduleMode.CRON || !cronExpression) {
      setCronPreview([]);
      setCronPreviewError(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.scheduler.previewCron({
          expression: cronExpression,
          timezone: timezone || undefined,
        });
        setCronPreview(res.nextRuns.map((ts) => new Date(ts).toLocaleString()));
        setCronPreviewError(null);
      } catch (e: any) {
        setCronPreviewError(e?.message || t("form.cron.previewError"));
        setCronPreview([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [mode, cronExpression, timezone, t]);

  return { cronPreview, cronPreviewError };
}
