import type { Translator } from "@/locales/types";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { SchedulerActionType } from "@shared/types/scheduler.types";
import { useMemo } from "react";
import type { FormState } from "../types";
import { WebhookActionFields } from "./WebhookActionFields";

interface ActionTypeFieldsProps {
  state: FormState;
  set: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  t: Translator;
}

export const ActionTypeFields = ({ state, set, t }: ActionTypeFieldsProps) => {
  const actionOptions = useMemo(() => Object.values(SchedulerActionType), []);

  const actionItems = actionOptions.map((opt) => ({
    value: opt,
    label: t(`form.actions.${opt}`),
  }));

  return (
    <div className="space-y-3">
      <Label>{t("form.actionTabs.title")}</Label>
      <Select
        items={actionItems}
        value={state.actionType}
        onValueChange={(v) => set("actionType", v as SchedulerActionType)}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {actionItems.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {state.actionType === SchedulerActionType.SERVER_COMMAND && (
        <div className="space-y-1.5">
          <Label>{t("form.actionFields.commandLabel")}</Label>
          <Input
            placeholder={t("form.actionFields.commandPlaceholder")}
            value={state.command}
            onChange={(e) => set("command", e.target.value)}
          />
        </div>
      )}

      {state.actionType === SchedulerActionType.BACKUP_CREATE && (
        <>
          <div className="space-y-1.5">
            <Label>{t("form.actionFields.backupNameLabel")}</Label>
            <Input
              placeholder={t("form.actionFields.backupNamePlaceholder")}
              value={state.backupNameTemplate}
              onChange={(e) => set("backupNameTemplate", e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {t("form.actionFields.backupNameHint")}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>{t("form.actionFields.backupDescriptionLabel")}</Label>
            <Input
              value={state.backupDescription}
              onChange={(e) => set("backupDescription", e.target.value)}
            />
          </div>
        </>
      )}

      {state.actionType === SchedulerActionType.HTTP_WEBHOOK && (
        <WebhookActionFields state={state} set={set} t={t} />
      )}
    </div>
  );
};
