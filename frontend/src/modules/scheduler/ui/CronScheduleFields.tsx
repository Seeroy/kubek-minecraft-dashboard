import type { Translator } from "@/locales/types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { FormState } from "../types";

interface CronScheduleFieldsProps {
  state: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  cronPreview: string[];
  cronPreviewError: string | null;
  t: Translator;
}

export const CronScheduleFields = ({
  state,
  set,
  cronPreview,
  cronPreviewError,
  t,
}: CronScheduleFieldsProps) => (
  <div className="space-y-3">
    <div className="space-y-1.5">
      <Label>{t("form.cron.expressionLabel")}</Label>
      <Input
        placeholder={t("form.cron.expressionPlaceholder")}
        className="font-mono"
        value={state.cronExpression}
        onChange={(e) => set("cronExpression", e.target.value)}
      />
    </div>
    <div className="rounded-md bg-muted/40 p-3">
      <div className="mb-2 text-xs font-medium text-muted-foreground uppercase">
        {t("form.cron.previewTitle")}
      </div>
      {cronPreviewError ? (
        <div className="text-xs text-destructive">{cronPreviewError}</div>
      ) : cronPreview.length === 0 ? (
        <div className="text-xs text-muted-foreground">
          {t("form.cron.previewLoading")}
        </div>
      ) : (
        <ul className="space-y-1 font-mono text-xs">
          {cronPreview.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  </div>
);
