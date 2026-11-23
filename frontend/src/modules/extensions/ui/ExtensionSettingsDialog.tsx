"use client";

import type { ExtensionSettingsResponse, SettingField } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ApiError } from "@/shared/lib/http";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { queryLoadError } from "@/shared/ui/load-error";
import { Plate } from "@/shared/ui/plate";
import { SecretInput } from "@/shared/ui/secret-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import { AlertCircle, Settings, Undo2, X } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useExtensionSettings, useUpdateExtensionSettingsMutation } from "../api/extensions.queries";

interface Props {
  extId: string;
  extName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const isSecret = (field: SettingField) => field.type === "secret" || !!field.secret;

// Values as the inputs hold them, numbers stay text until saving
type Draft = Record<string, unknown>;

function initialDraft(data: ExtensionSettingsResponse): Draft {
  const draft: Draft = {};
  for (const field of data.schema) {
    if (isSecret(field)) continue;
    const value = field.key in data.values ? data.values[field.key] : field.default;
    if (field.type === "number") draft[field.key] = value === undefined || value === null ? "" : String(value);
    else if (field.type === "boolean") draft[field.key] = value === true;
    else if (field.type === "multiselect") draft[field.key] = Array.isArray(value) ? value.map(String) : [];
    else draft[field.key] = value === undefined || value === null ? "" : String(value);
  }
  return draft;
}

// Backend may name the field with or without the values. prefix
const fieldKey = (field: string) => field.replace(/^values\./, "");

/** Form built from the extension's settingsSchema */
export function ExtensionSettingsDialog({ extId, extName, open, onOpenChange }: Props) {
  const { t } = useTranslation("modules.extensions.settingsForm");
  const query = useExtensionSettings(extId, { enabled: open });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader className="flex-row items-center gap-3">
          <Plate tone="purple">
            <Settings />
          </Plate>
          <div className="min-w-0">
            <DialogTitle className="truncate">{t("title", extName)}</DialogTitle>
            <DialogDescription>{t("description")}</DialogDescription>
          </div>
        </DialogHeader>
        {query.data ? (
          // Remount on fresh data so the form starts from what is saved
          <SettingsForm key={query.dataUpdatedAt} extId={extId} data={query.data} onDone={() => onOpenChange(false)} />
        ) : query.isError ? (
          <DialogBody>{queryLoadError(query)}</DialogBody>
        ) : (
          <DialogBody className="flex justify-center py-8">
            <Spinner />
          </DialogBody>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SettingsForm({ extId, data, onDone }: { extId: string; data: ExtensionSettingsResponse; onDone: () => void }) {
  const { t } = useTranslation("modules.extensions.settingsForm");
  // Labels and descriptions are keys from the extension locales
  const { t: tRoot } = useTranslation();
  const { notify } = useNotifications();
  const save = useUpdateExtensionSettingsMutation(extId);
  const [draft, setDraft] = useState<Draft>(() => initialDraft(data));
  const [secretText, setSecretText] = useState<Record<string, string>>({});
  const [secretRemoved, setSecretRemoved] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const text = (key: string | undefined) => {
    if (!key) return "";
    const translated = tRoot(key);
    return translated.startsWith("NOT TRANSLATED") ? key : translated;
  };
  const clearError = (key: string) =>
    setErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  const set = (key: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    clearError(key);
  };

  const buildValues = (): Record<string, unknown> => {
    const values: Record<string, unknown> = {};
    for (const field of data.schema) {
      const { key } = field;
      if (isSecret(field)) {
        // Left out keeps the stored secret
        if (secretRemoved[key]) values[key] = null;
        else if (secretText[key]) values[key] = secretText[key];
        continue;
      }
      const value = draft[key];
      if (field.type === "number") {
        const raw = String(value ?? "").trim();
        values[key] = raw === "" ? null : Number(raw);
      } else {
        values[key] = value;
      }
    }
    return values;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    setErrors({});
    try {
      await save.mutateAsync(buildValues());
      notify({ type: "success", title: t("saved") });
      onDone();
    } catch (err) {
      const details = err instanceof ApiError ? (err.details ?? []) : [];
      const known = new Set(data.schema.map((field) => field.key));
      const byField: Record<string, string> = {};
      for (const detail of details) {
        const key = fieldKey(detail.field);
        if (known.has(key) && !byField[key]) byField[key] = detail.message;
      }
      setErrors(byField);
      // Errors without a matching field still need a place on screen
      const unmatched = details.some((detail) => !known.has(fieldKey(detail.field)));
      if (!Object.keys(byField).length || unmatched) {
        setFormError(err instanceof ApiError && err.message ? err.message : getApiErrorMessage(err));
      }
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="contents" noValidate>
      <DialogBody className="grid gap-5">
        {data.schema.length === 0 && <p className="text-[13px] text-muted-foreground">{t("empty")}</p>}
        {data.schema.map((field) => {
          const id = `ext-setting-${field.key}`;
          const error = errors[field.key];
          const description = field.description ? text(field.description) : null;
          const label = text(field.label) || field.key;

          if (field.type === "boolean" && !isSecret(field)) {
            return (
              <Field key={field.key}>
                <label className="flex cursor-pointer items-center justify-between gap-4">
                  <span className="grid gap-0.5">
                    <span className="text-[13px] font-medium">{label}</span>
                    {description && <span className="text-[12.5px] text-muted-foreground">{description}</span>}
                  </span>
                  <Switch checked={draft[field.key] === true} onCheckedChange={(checked) => set(field.key, checked)} />
                </label>
                {error && <FieldError>{error}</FieldError>}
              </Field>
            );
          }

          return (
            <Field key={field.key}>
              <FieldLabel htmlFor={field.type === "multiselect" ? undefined : id}>{label}</FieldLabel>
              {isSecret(field) ? (
                <SecretControl
                  id={id}
                  stored={!!data.secrets[field.key]}
                  value={secretText[field.key] ?? ""}
                  removed={!!secretRemoved[field.key]}
                  invalid={!!error}
                  onChange={(value) => {
                    setSecretText((prev) => ({ ...prev, [field.key]: value }));
                    clearError(field.key);
                  }}
                  onRemovedChange={(removed) => {
                    setSecretRemoved((prev) => ({ ...prev, [field.key]: removed }));
                    clearError(field.key);
                  }}
                />
              ) : field.type === "select" ? (
                <Select<string> value={(draft[field.key] as string) || null} onValueChange={(value) => value !== null && set(field.key, value)}>
                  <SelectTrigger id={id} className="w-full" aria-invalid={!!error}>
                    <SelectValue>{(value: string | null) => (value ? text(value) : t("choose"))}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(field.options ?? []).map((option) => (
                      <SelectItem key={option} value={option}>
                        {text(option)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "multiselect" ? (
                <div className="flex flex-wrap gap-x-4 gap-y-2" role="group" aria-label={label}>
                  {(field.options ?? []).map((option) => {
                    const selected = (draft[field.key] as string[] | undefined) ?? [];
                    return (
                      <label key={option} className="flex cursor-pointer items-center gap-2 text-[13px]">
                        <Checkbox
                          checked={selected.includes(option)}
                          onCheckedChange={(checked) =>
                            set(field.key, checked ? [...selected, option] : selected.filter((item) => item !== option))
                          }
                        />
                        {text(option)}
                      </label>
                    );
                  })}
                </div>
              ) : (
                <Input
                  id={id}
                  type={field.type === "number" ? "number" : "text"}
                  inputMode={field.type === "number" ? "decimal" : undefined}
                  autoComplete="off"
                  value={String(draft[field.key] ?? "")}
                  aria-invalid={!!error}
                  onChange={(event) => set(field.key, event.target.value)}
                />
              )}
              {description && <FieldDescription>{description}</FieldDescription>}
              {error && <FieldError>{error}</FieldError>}
            </Field>
          );
        })}

        {formError && (
          <Alert variant="destructive">
            <AlertCircle />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        )}
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone} disabled={save.isPending}>
          {t("cancel")}
        </Button>
        <Button type="submit" disabled={save.isPending}>
          {save.isPending && <Spinner />}
          {t("save")}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface SecretControlProps {
  id: string;
  stored: boolean;
  value: string;
  removed: boolean;
  invalid: boolean;
  onChange: (value: string) => void;
  onRemovedChange: (removed: boolean) => void;
}

function SecretControl({ id, stored, value, removed, invalid, onChange, onRemovedChange }: SecretControlProps) {
  const { t } = useTranslation("modules.extensions.settingsForm");

  if (removed) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-md border border-dashed border-border px-3 py-2 text-[13px] text-muted-foreground">
        {t("secretRemoved")}
        <Button type="button" variant="ghost" size="sm" onClick={() => onRemovedChange(false)}>
          <Undo2 />
          {t("undo")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">
        <SecretInput
          id={id}
          secret={stored ? { set: true, hint: null } : undefined}
          value={value}
          aria-invalid={invalid}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
      {stored && (
        <Button type="button" variant="ghost" size="sm" className="hover:bg-danger/10 hover:text-danger" onClick={() => onRemovedChange(true)}>
          <X />
          {t("removeSecret")}
        </Button>
      )}
    </div>
  );
}
