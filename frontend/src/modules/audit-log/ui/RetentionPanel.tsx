"use client";
import type { AuditRetention, AuditRetentionState } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useDebouncedValue } from "@/shared/hooks/use-debounced-value";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DataReveal } from "@/shared/ui/data-reveal";
import { queryLoadError } from "@/shared/ui/load-error";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/shared/ui/input-group";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Spinner } from "@/shared/ui/spinner";
import { CalendarDays, Layers, ScrollText, TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
import { useAuditRetention, useAuditRetentionPreview, useSaveAuditRetention } from "../api/audit-log.queries";
import { SAMPLE_RETENTION } from "../data/samples";

const LIMITS = { keepDays: { min: 1, max: 3650 }, maxEntries: { min: 1000, max: 10_000_000 } } as const;

const inRange = (value: number | null, { min, max }: { min: number; max: number }) => value == null || (value >= min && value <= max);

function LimitInput({ id, value, unit, onChange }: { id: string; value: number | null; unit: string; onChange: (next: number | null) => void }) {
  const { t } = useTranslation("modules.auditLog.retention");
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        type="number"
        min={1}
        inputMode="numeric"
        className="num"
        placeholder={t("unlimited")}
        value={value ?? ""}
        // An empty field means no limit
        onChange={(e) => {
          const next = Math.floor(Number(e.target.value));
          onChange(e.target.value === "" || !Number.isFinite(next) || next < 1 ? null : next);
        }}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupText>{unit}</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  );
}

/** Rotation limits of the audit log, saving prunes old entries right away */
export function RetentionPanel() {
  const retention = useAuditRetention();
  return (
    <DataReveal id="audit-retention" data={retention.data} sample={SAMPLE_RETENTION} error={queryLoadError(retention)}>
      {(state) => <RetentionForm state={state} />}
    </DataReveal>
  );
}

function RetentionForm({ state }: { state: AuditRetentionState }) {
  const { t } = useTranslation("modules.auditLog.retention");
  const { notify } = useNotifications();
  const id = useId();
  const save = useSaveAuditRetention();
  const [draft, setDraft] = useState<AuditRetention | null>(null);

  const saved = state.retention;
  const value = draft ?? saved;
  const dirty = !!draft && (draft.keepDays !== saved.keepDays || draft.maxEntries !== saved.maxEntries);
  const valid = inRange(value.keepDays, LIMITS.keepDays) && inRange(value.maxEntries, LIMITS.maxEntries);
  const preview = useAuditRetentionPreview(useDebouncedValue(dirty && valid ? draft : null, 400));
  const doomed = dirty && valid ? (preview.data?.removed ?? 0) : 0;

  const submit = () =>
    draft &&
    save.mutate(draft, {
      onSuccess: () => {
        setDraft(null);
        notify({ type: "success", title: t("saved") });
      },
      onError: (error) => notify({ type: "error", title: t("failed"), message: getApiErrorMessage(error) }),
    });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {state.total && state.oldestAt ? t("summary", state.total, new Date(state.oldestAt).toLocaleDateString()) : t("emptyLog")}
        </Badge>
        <Button className="ml-auto" variant={doomed > 0 ? "destructive" : "default"} disabled={!dirty || !valid || save.isPending} onClick={submit}>
          {save.isPending && <Spinner />}
          {t("save")}
        </Button>
      </div>
      {doomed > 0 && (
        <Alert variant="destructive" className="mb-4">
          <TriangleAlert />
          <AlertDescription>{t("willDelete", doomed)}</AlertDescription>
        </Alert>
      )}
      <SettingsGroup tone="amber" icon={ScrollText} title={t("title")} description={t("description")} note={t("note")}>
        <SettingsField label={t("keepDays")} icon={CalendarDays} hint={t("keepDaysHint", LIMITS.keepDays.max)} htmlFor={`${id}-days`}>
          <LimitInput id={`${id}-days`} value={value.keepDays} unit={t("daysUnit")} onChange={(keepDays) => setDraft({ ...value, keepDays })} />
        </SettingsField>
        <SettingsField
          label={t("maxEntries")}
          icon={Layers}
          hint={t("maxEntriesHint")}
          warning={inRange(value.maxEntries, LIMITS.maxEntries) ? undefined : t("maxEntriesInvalid", LIMITS.maxEntries.min)}
          htmlFor={`${id}-max`}
        >
          <LimitInput id={`${id}-max`} value={value.maxEntries} unit={t("entriesUnit")} onChange={(maxEntries) => setDraft({ ...value, maxEntries })} />
        </SettingsField>
      </SettingsGroup>
    </div>
  );
}
