"use client";

import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { FieldError } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Switch } from "@/shared/ui/switch";
import { Activity, Lock, Network, Plus, Shield, X } from "lucide-react";
import { useState } from "react";
import { Controller, useWatch, type UseFormReturn } from "react-hook-form";
import { CIDR_REGEX, type MainConfigFormData } from "../validations/schema";

export default function SecuritySettings({ form }: { form: UseFormReturn<MainConfigFormData> }) {
  const { t } = useTranslation("modules.settings.security");
  const { t: tRoot } = useTranslation();
  const { control, formState } = form;
  const { errors, dirtyFields } = formState;
  const [enabled, watchedSubnets] = useWatch({ control, name: ["subnetsAccessRestriction.enabled", "subnetsAccessRestriction.subnets"] });
  const subnets = watchedSubnets ?? [];
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);

  const setSubnets = (next: string[]) =>
    form.setValue("subnetsAccessRestriction.subnets", next, { shouldDirty: true, shouldValidate: true });

  const add = () => {
    const value = draft.trim();
    if (!CIDR_REGEX.test(value)) return setDraftError("modules.settings.validation.subnets.itemInvalid");
    if (subnets.includes(value)) return setDraftError("modules.settings.validation.subnets.duplicate");
    setSubnets([...subnets, value]);
    setDraft("");
  };

  const listError = errors.subnetsAccessRestriction?.subnets;

  return (
    <>
      <SettingsGroup tone="red" icon={Shield} title={t("title")} description={t("description")}>
        <SettingsField
          label={t("subnets.enable")}
          icon={Lock}
          hint={t("subnets.enableHint")}
          changed={!!dirtyFields.subnetsAccessRestriction?.enabled}
          inline
        >
          <Controller
            control={control}
            name="subnetsAccessRestriction.enabled"
            render={({ field }) => (
              <Switch
                checked={!!field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked);
                  void form.trigger("subnetsAccessRestriction");
                }}
                aria-label={t("subnets.enable")}
              />
            )}
          />
        </SettingsField>

        <div className="col-span-full grid gap-2 transition-opacity aria-disabled:opacity-45" aria-disabled={!enabled}>
          <div className="flex items-center gap-1.5 text-[13px] font-medium">
            <Network className="size-3.5 text-tone" />
            {t("subnets.allowed")}
            <Badge variant="secondary" className="ml-auto">
              {subnets.length}
            </Badge>
          </div>

          {subnets.length === 0 ? (
            <div className="rounded-md border border-dashed border-border px-4 py-5 text-center">
              <p className="font-medium">{t("subnets.emptyTitle")}</p>
              <p className="text-[12.5px] text-muted-foreground">{t("subnets.emptyDescription")}</p>
            </div>
          ) : (
            subnets.map((subnet, index) => (
              <div key={subnet} className="flex items-center gap-2 rounded-md bg-subtle py-1 pr-1 pl-3 font-mono text-[12.5px]">
                <Network className="size-3.5 text-muted-foreground" />
                <span className="flex-1">{subnet}</span>
                {listError?.[index]?.message && <span className="font-sans text-xs text-danger">{tRoot(listError[index].message)}</span>}
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="hover:bg-danger/10 hover:text-danger"
                  aria-label={t("subnets.remove", subnet)}
                  title={t("subnets.remove", subnet)}
                  onClick={() => setSubnets(subnets.filter((_, i) => i !== index))}
                >
                  <X />
                </Button>
              </div>
            ))
          )}

          <div className="flex gap-1.5">
            <Input
              className="font-mono"
              value={draft}
              placeholder={t("subnets.placeholder")}
              aria-invalid={!!draftError}
              onChange={(e) => {
                setDraft(e.target.value);
                setDraftError(null);
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                add();
              }}
            />
            <Button variant="outline" disabled={!draft.trim()} onClick={add}>
              <Plus />
              {t("subnets.add")}
            </Button>
          </div>
          {draftError && <FieldError>{tRoot(draftError)}</FieldError>}
          {listError?.message && <FieldError>{tRoot(listError.message)}</FieldError>}
        </div>
      </SettingsGroup>

      <SettingsGroup tone="gray" icon={Activity} title={t("telemetry.title")} description={t("telemetry.description")}>
        <SettingsField
          label={t("telemetry.enable")}
          icon={Activity}
          changed={!!dirtyFields.telemetry?.enabled}
          hint={
            <>
              {t("telemetry.hintStart")} <code className="font-mono text-[12px]">KUBEK_TELEMETRY=off</code>
            </>
          }
          inline
        >
          <Controller
            control={control}
            name="telemetry.enabled"
            render={({ field }) => <Switch checked={!!field.value} onCheckedChange={field.onChange} aria-label={t("telemetry.enable")} />}
          />
        </SettingsField>
      </SettingsGroup>
    </>
  );
}
