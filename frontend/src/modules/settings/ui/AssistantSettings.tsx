"use client";

import { api, type AssistantSettingsResponse } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/shared/ui/input-group";
import { SecretInput } from "@/shared/ui/secret-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Skeleton } from "@/shared/ui/skeleton";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import type { AssistantPresetId, AssistantSettings as Settings } from "@shared/types/assistant.types";
import { Boxes, Footprints, Globe, KeyRound, ListRestart, Plug, Power, Sparkles, Thermometer } from "lucide-react";
import { useState } from "react";
import { useAssistantModels, useAssistantSettingsQuery, useSaveAssistantSettings, useTestAssistant } from "../api/assistant.queries";

type Draft = Settings & { apiKey: string };

const toDraft = ({ settings }: AssistantSettingsResponse): Draft => ({
  enabled: settings.enabled,
  preset: settings.preset,
  baseUrl: settings.baseUrl,
  model: settings.model,
  temperature: settings.temperature,
  maxSteps: settings.maxSteps,
  apiKey: "",
});

const FIELDS = ["enabled", "preset", "baseUrl", "model", "temperature", "maxSteps", "apiKey"] as const;

function AssistantForm({ data }: { data: AssistantSettingsResponse }) {
  const { t } = useTranslation("modules.assistant.settings");
  const { notify } = useNotifications();
  const saved = toDraft(data);
  const [draft, setDraft] = useState<Draft>(saved);
  const save = useSaveAssistantSettings();
  const models = useAssistantModels();
  const test = useTestAssistant();
  const preset = data.presets.find((p) => p.id === draft.preset);
  const changed = (key: (typeof FIELDS)[number]) => draft[key] !== saved[key];
  const dirty = FIELDS.some(changed);
  const connection = { baseUrl: draft.baseUrl, apiKey: draft.apiKey || undefined, model: draft.model || undefined };

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const pickPreset = (id: AssistantPresetId) => {
    const next = data.presets.find((p) => p.id === id);
    setDraft((d) => ({ ...d, preset: id, baseUrl: next?.baseUrl || d.baseUrl }));
    models.reset();
  };

  const loadModels = () => models.mutate(connection, { onError: (error) => notify({ type: "error", title: getApiErrorMessage(error) }) });

  const revealKey = async () => {
    const value = await api.assistant.revealKey();
    if (value) set("apiKey", value);
    return value;
  };

  const submit = () =>
    save.mutate(
      { ...draft, apiKey: draft.apiKey || undefined },
      {
        onSuccess: () => {
          setDraft((d) => ({ ...d, apiKey: "" }));
          notify({ type: "success", title: t("saved") });
        },
        onError: (error) => notify({ type: "error", title: getApiErrorMessage(error) }),
      }
    );

  return (
    <SettingsGroup tone="purple" icon={Sparkles} title={t("title")} description={t("description")} note={preset?.local ? t("privacyLocal") : t("privacy")}>
      <SettingsField label={t("enable")} icon={Power} hint={t("enableHint")} changed={changed("enabled")} inline>
        <Switch checked={draft.enabled} onCheckedChange={(checked) => set("enabled", checked)} aria-label={t("enable")} />
      </SettingsField>

      <SettingsField label={t("preset")} icon={Plug} hint={t("presetHint")} changed={changed("preset")}>
        <Select<AssistantPresetId> value={draft.preset} onValueChange={(value) => value && pickPreset(value)}>
          <SelectTrigger aria-label={t("preset")}>
            <SelectValue>{(value: AssistantPresetId) => data.presets.find((p) => p.id === value)?.label ?? value}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {data.presets.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.id === "custom" ? t("custom") : p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </SettingsField>

      <SettingsField label={t("baseUrl")} icon={Globe} hint={t("baseUrlHint")} changed={changed("baseUrl")} htmlFor="assistant-url">
        <Input
          id="assistant-url"
          className="font-mono"
          value={draft.baseUrl}
          placeholder="http://localhost:11434/v1"
          onChange={(e) => set("baseUrl", e.target.value)}
        />
      </SettingsField>

      <SettingsField
        label={t("apiKey")}
        icon={KeyRound}
        hint={preset?.requiresKey ? t("apiKeyHint") : t("apiKeyOptional")}
        changed={changed("apiKey")}
        htmlFor="assistant-key"
      >
        <SecretInput
          id="assistant-key"
          value={draft.apiKey}
          placeholder={t("apiKeyPlaceholder")}
          secret={data.settings.apiKey}
          onReveal={revealKey}
          onChange={(e) => set("apiKey", e.target.value)}
        />
      </SettingsField>

      <SettingsField label={t("model")} icon={Boxes} hint={t("modelHint")} changed={changed("model")} htmlFor="assistant-model">
        <InputGroup>
          <InputGroupInput
            id="assistant-model"
            className="font-mono"
            list="assistant-models"
            value={draft.model}
            placeholder={preset?.modelHint || t("modelPlaceholder")}
            onChange={(e) => set("model", e.target.value)}
          />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="xs" disabled={!draft.baseUrl || models.isPending} onClick={loadModels}>
              {models.isPending ? <Spinner /> : <ListRestart />}
              {t("loadModels")}
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
        <datalist id="assistant-models">
          {models.data?.map((id) => (
            <option key={id} value={id} />
          ))}
        </datalist>
        {models.data && <p className="text-[12.5px] text-muted-foreground">{t("modelsFound", models.data.length)}</p>}
      </SettingsField>

      <SettingsField label={t("temperature")} icon={Thermometer} hint={t("temperatureHint")} changed={changed("temperature")} htmlFor="assistant-temp">
        <Input
          id="assistant-temp"
          type="number"
          min={0}
          max={2}
          step={0.1}
          value={draft.temperature}
          onChange={(e) => set("temperature", Number(e.target.value))}
        />
      </SettingsField>

      <SettingsField label={t("maxSteps")} icon={Footprints} hint={t("maxStepsHint")} changed={changed("maxSteps")} htmlFor="assistant-steps">
        <Input id="assistant-steps" type="number" min={1} max={20} step={1} value={draft.maxSteps} onChange={(e) => set("maxSteps", Number(e.target.value))} />
      </SettingsField>

      <div className="col-span-full flex flex-wrap items-center justify-end gap-2 border-t border-border pt-4">
        {test.data && (
          <Badge variant={test.data.ok ? "success" : "destructive"} className="mr-auto max-w-full truncate" title={test.data.error ?? undefined}>
            {test.data.ok ? t("testOk", test.data.latencyMs) : (test.data.error ?? t("testFailed"))}
          </Badge>
        )}
        <Button variant="outline" disabled={!draft.baseUrl || test.isPending} onClick={() => test.mutate(connection)}>
          {test.isPending && <Spinner />}
          {t("test")}
        </Button>
        <Button disabled={!dirty || save.isPending} onClick={submit}>
          {save.isPending && <Spinner />}
          {t("save")}
        </Button>
      </div>
    </SettingsGroup>
  );
}

export default function AssistantSettings() {
  const query = useAssistantSettingsQuery();
  if (!query.data) return <Skeleton className="h-96 rounded-lg" />;
  // Remounts the form with fresh values after each save
  return <AssistantForm key={JSON.stringify(query.data.settings)} data={query.data} />;
}
