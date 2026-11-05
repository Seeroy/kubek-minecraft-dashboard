"use client";
import { CompanionLock, useCompanion } from "@/modules/companion";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Field, FieldDescription, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import type { TaskFormState } from "../../lib/form";
import type { SetField } from "../TaskFormDialog";

const DEFAULT_COUNTDOWN = 60;

interface ShutdownFieldsProps {
  serverId: string;
  state: TaskFormState;
  set: SetField;
}

/** Stop and restart options: wait for an empty server, warn players in game */
export function ShutdownFields({ serverId, state, set }: ShutdownFieldsProps) {
  const { t } = useTranslation("modules.scheduler.form.shutdown");
  const companion = useCompanion(serverId);
  // A saved countdown still runs once the plugin shows up, only a fresh one is blocked
  const locked = (companion.state === "missing" || companion.state === "unsupported") && !state.countdownSec;
  const counting = state.countdownSec > 0;

  return (
    <div className="grid gap-3">
      <label className="flex items-start justify-between gap-3 text-[13px]">
        <span className="grid gap-0.5">
          <span className="font-medium">{t("skipIfOnline")}</span>
          <span className="text-xs text-muted-foreground">{t("skipIfOnlineHint")}</span>
        </span>
        <Switch checked={state.skipIfPlayersOnline} onCheckedChange={(value) => set("skipIfPlayersOnline", value)} />
      </label>

      <label className="flex items-start justify-between gap-3 text-[13px]">
        <span className="grid gap-0.5">
          <span className="font-medium">{t("countdown")}</span>
          <span className="text-xs text-muted-foreground">{t("countdownHint")}</span>
        </span>
        <CompanionLock state={companion.state} locked={locked}>
          <Switch checked={counting} disabled={locked} onCheckedChange={(value) => set("countdownSec", value ? DEFAULT_COUNTDOWN : 0)} />
        </CompanionLock>
      </label>

      {counting && (
        <div className="grid gap-3 sm:grid-cols-[120px_minmax(0,1fr)]">
          <Field>
            <FieldLabel htmlFor="task-countdown">{t("seconds")}</FieldLabel>
            <Input
              id="task-countdown"
              type="number"
              min={5}
              max={600}
              value={state.countdownSec}
              onChange={(e) => set("countdownSec", Math.min(600, Math.max(5, Number(e.target.value) || DEFAULT_COUNTDOWN)))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="task-countdown-message">{t("message")}</FieldLabel>
            <Input
              id="task-countdown-message"
              maxLength={256}
              placeholder={t("messagePlaceholder")}
              value={state.countdownMessage}
              onChange={(e) => set("countdownMessage", e.target.value)}
            />
            <FieldDescription>{t("messageHint")}</FieldDescription>
          </Field>
        </div>
      )}
    </div>
  );
}
