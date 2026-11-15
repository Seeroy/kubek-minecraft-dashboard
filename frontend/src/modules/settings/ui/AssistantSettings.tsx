"use client";

import { api, type AssistantSettingsResponse } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DataReveal } from "@/shared/ui/data-reveal";
import { queryLoadError } from "@/shared/ui/load-error";
import { Input } from "@/shared/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { SecretInput } from "@/shared/ui/secret-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Spinner } from "@/shared/ui/spinner";
import { Switch } from "@/shared/ui/switch";
import {
  ASSISTANT_STEPS,
  type AssistantPresetId,
  type AssistantSettings as Settings,
  type AssistantVisionMode,
} from "@shared/types/assistant.types";
import { Boxes, Coins, Eye, Footprints, Globe, KeyRound, ListRestart, Plug, Power, Sparkles, Thermometer } from "lucide-react";
import { useState } from "react";
import { useAssistantModels, useAssistantSettingsQuery, useSaveAssistantSettings, useTestAssistant } from "../api/assistant.queries";
import { SAMPLE_ASSISTANT_SETTINGS } from "../data/samples";
import { ModelPicker } from "./ModelPicker";

const VISION_MODES: AssistantVisionMode[] = ["auto", "on", "off"];

type Draft = Settings & { apiKey: string };

const clamp = (value: number, min: number, max: number) => (Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min);

const toDraft = ({ settings }: AssistantSettingsResponse): Draft => ({
  enabled: settings.enabled,
  preset: settings.preset,
  baseUrl: settings.baseUrl,
  model: settings.model,
  temperature: settings.temperature,
  maxSteps: settings.maxSteps,
  priceInput: settings.priceInput,
  priceOutput: settings.priceOutput,
  priceCache: settings.priceCache,
  vision: settings.vision,
  apiKey: "",
});

const FIELDS = ["enabled", "preset", "baseUrl", "model", "vision", "temperature", "maxSteps", "priceInput", "priceOutput", "priceCache", "apiKey"] as const;
const MAX_PRICE = 10_000;

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

  // Errors are toasted by the query client already
  const loadModels = () => models.mutate(connection);

  const revealKey = async () => {
    const value = await api.assistant.revealKey();
    if (value) set("apiKey", value);
    return value;
  };

  const submit = () =>
    save.mutate(
      {
        ...draft,
        temperature: clamp(draft.temperature, 0, 2),
        maxSteps: Math.round(clamp(draft.maxSteps, ASSISTANT_STEPS.min, ASSISTANT_STEPS.max)),
        priceInput: clamp(draft.priceInput, 0, MAX_PRICE),
        priceOutput: clamp(draft.priceOutput, 0, MAX_PRICE),
        priceCache: clamp(draft.priceCache, 0, MAX_PRICE),
        apiKey: draft.apiKey || undefined,
      },
      {
        onSuccess: () => {
          setDraft((d) => ({ ...d, apiKey: "" }));
          notify({ type: "success", title: t("saved") });
        },
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
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <ModelPicker
              id="assistant-model"
              value={draft.model}
              models={models.data}
              placeholder={preset?.modelHint || t("modelPlaceholder")}
              onChange={(model) => set("model", model)}
            />
          </div>
          <Button variant="outline" className="shrink-0" disabled={!draft.baseUrl || models.isPending} onClick={loadModels}>
            {models.isPending ? <Spinner /> : <ListRestart />}
            {t("loadModels")}
          </Button>
        </div>
        {models.data && <p className="text-[12.5px] text-muted-foreground">{t("modelsFound", models.data.length)}</p>}
      </SettingsField>

      <SettingsField label={t("vision")} icon={Eye} hint={t("visionHint")} changed={changed("vision")}>
        <Select<AssistantVisionMode> value={draft.vision} onValueChange={(value) => value && set("vision", value)}>
          <SelectTrigger aria-label={t("vision")}>
            <SelectValue>{(value: AssistantVisionMode) => t(`visionModes.${value}`)}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {VISION_MODES.map((mode) => (
              <SelectItem key={mode} value={mode}>
                {t(`visionModes.${mode}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          onBlur={() => set("temperature", clamp(draft.temperature, 0, 2))}
        />
      </SettingsField>

      <SettingsField
        label={t("maxSteps")}
        icon={Footprints}
        hint={t("maxStepsHint", ASSISTANT_STEPS.min, ASSISTANT_STEPS.max)}
        changed={changed("maxSteps")}
        htmlFor="assistant-steps"
      >
        <Input
          id="assistant-steps"
          type="number"
          min={ASSISTANT_STEPS.min}
          max={ASSISTANT_STEPS.max}
          step={1}
          value={draft.maxSteps}
          onChange={(e) => set("maxSteps", Number(e.target.value))}
          onBlur={() => set("maxSteps", Math.round(clamp(draft.maxSteps, ASSISTANT_STEPS.min, ASSISTANT_STEPS.max)))}
        />
      </SettingsField>

      {!preset?.local && (
        <SettingsField label={t("price")} icon={Coins} hint={t("priceHint")} changed={changed("priceInput") || changed("priceOutput") || changed("priceCache")}>
          <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
            {(["priceInput", "priceCache", "priceOutput"] as const).map((key) => (
              <InputGroup key={key}>
                <InputGroupAddon>$</InputGroupAddon>
                <InputGroupInput
                  type="number"
                  min={0}
                  max={MAX_PRICE}
                  step={0.01}
                  value={draft[key]}
                  aria-label={t(key)}
                  onChange={(e) => set(key, Number(e.target.value))}
                  onBlur={() => set(key, clamp(draft[key], 0, MAX_PRICE))}
                />
                <InputGroupAddon align="inline-end" className="text-[11.5px]">
                  {t(key)}
                </InputGroupAddon>
              </InputGroup>
            ))}
          </div>
        </SettingsField>
      )}

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
  // Remounts the form with fresh values after each save
  return (
    <DataReveal id="settings-assistant" data={query.data} sample={SAMPLE_ASSISTANT_SETTINGS} error={queryLoadError(query)}>
      {(data) => <AssistantForm key={JSON.stringify(data.settings)} data={data} />}
    </DataReveal>
  );
}
