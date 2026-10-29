"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { Plate } from "@/shared/ui/plate";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { SchedulerActionType } from "@shared/types/scheduler.types";
import { HTTP_METHODS, type HttpMethod, type TaskFormState } from "../../lib/form";
import { actionLook } from "../../lib/look";
import type { SetField } from "../TaskFormDialog";

const ACTIONS = Object.values(SchedulerActionType);

interface ActionFieldsProps {
  state: TaskFormState;
  set: SetField;
  headersError: boolean;
  onHeadersChange: (value: string) => void;
}

function Params({ state, set, headersError, onHeadersChange }: ActionFieldsProps) {
  const { t } = useTranslation("modules.scheduler.form");

  switch (state.actionType) {
    case SchedulerActionType.SERVER_COMMAND:
      return (
        <Field>
          <FieldLabel htmlFor="task-command">{t("command")}</FieldLabel>
          <Input
            id="task-command"
            className="font-mono"
            placeholder={t("commandPlaceholder")}
            value={state.command}
            onChange={(e) => set("command", e.target.value)}
          />
        </Field>
      );
    case SchedulerActionType.BACKUP_CREATE:
      return (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="task-backup-name">{t("backupName")}</FieldLabel>
            <Input
              id="task-backup-name"
              className="font-mono"
              placeholder="auto-{{date}}"
              value={state.backupNameTemplate}
              onChange={(e) => set("backupNameTemplate", e.target.value)}
            />
            <FieldDescription>{t("backupNameHint")}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="task-backup-description">{t("backupDescription")}</FieldLabel>
            <Input id="task-backup-description" value={state.backupDescription} onChange={(e) => set("backupDescription", e.target.value)} />
          </Field>
        </div>
      );
    case SchedulerActionType.HTTP_WEBHOOK:
      return (
        <>
          <div className="grid grid-cols-[120px_minmax(0,1fr)] gap-3">
            <Field>
              <span className="font-medium">{t("method")}</span>
              <Select<HttpMethod> value={state.webhookMethod} onValueChange={(value) => value && set("webhookMethod", value)}>
                <SelectTrigger className="w-full" aria-label={t("method")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {HTTP_METHODS.map((method) => (
                    <SelectItem key={method} value={method}>
                      {method}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="task-url">{t("url")}</FieldLabel>
              <Input
                id="task-url"
                type="url"
                className="font-mono"
                placeholder="https://example.com/hook"
                value={state.webhookUrl}
                onChange={(e) => set("webhookUrl", e.target.value)}
              />
            </Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="task-headers">{t("headers")}</FieldLabel>
              <Textarea
                id="task-headers"
                rows={3}
                className="font-mono text-xs"
                aria-invalid={headersError}
                value={state.webhookHeaders}
                onChange={(e) => onHeadersChange(e.target.value)}
              />
              {headersError && <FieldError>{t("headersInvalid")}</FieldError>}
            </Field>
            {state.webhookMethod !== "GET" && (
              <Field>
                <FieldLabel htmlFor="task-body">{t("body")}</FieldLabel>
                <Textarea
                  id="task-body"
                  rows={3}
                  className="font-mono text-xs"
                  value={state.webhookBody}
                  onChange={(e) => set("webhookBody", e.target.value)}
                />
              </Field>
            )}
          </div>
        </>
      );
    default:
      return <p className="text-[12.5px] text-muted-foreground">{t("noParams")}</p>;
  }
}

export function ActionFields(props: ActionFieldsProps) {
  const { t } = useTranslation("modules.scheduler");
  const { state, set } = props;

  return (
    <>
      <RadioGroup
        value={state.actionType}
        onValueChange={(value) => set("actionType", value as SchedulerActionType)}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
      >
        {ACTIONS.map((action) => {
          const { icon: Icon, tone } = actionLook[action];
          return (
            <FieldLabel key={action}>
              <Field orientation="horizontal" className="gap-2.5 p-2.5!">
                <Plate tone={tone} size="sm">
                  <Icon />
                </Plate>
                <span className="min-w-0 text-[13px] leading-tight font-medium">{t(`actions.${action}`)}</span>
                <RadioGroupItem value={action} className="sr-only" />
              </Field>
            </FieldLabel>
          );
        })}
      </RadioGroup>
      <Params {...props} />
    </>
  );
}
