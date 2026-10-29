"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/shared/ui/input-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { SettingsField, SettingsGroup } from "@/shared/ui/settings";
import { Switch } from "@/shared/ui/switch";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import type { BackupPolicy, BackupStorage, BackupUploadMode, RetentionLimits } from "@shared/types/backup.types";
import { CalendarDays, Cloud, CloudUpload, HardDrive, Layers, Trash2 } from "lucide-react";
import { useId } from "react";

const NONE = "none";

interface PolicyFieldsProps {
  value: BackupPolicy;
  onChange: (next: BackupPolicy) => void;
  storages: BackupStorage[];
}

/** Local and remote retention limits plus upload settings */
export function PolicyFields({ value, onChange, storages }: PolicyFieldsProps) {
  const { t } = useTranslation("modules.backups.policy");
  const { local, remote } = value;
  const setLocal = (limits: RetentionLimits) => onChange({ ...value, local: limits });
  const setRemote = (patch: Partial<BackupPolicy["remote"]>) => onChange({ ...value, remote: { ...remote, ...patch } });
  const hasStorage = !!remote.storageId;

  return (
    <>
      <SettingsGroup tone="cyan" icon={HardDrive} title={t("local.title")} description={t("local.description")} note={t("note")}>
        <LimitFields limits={local} onChange={setLocal} />
      </SettingsGroup>

      <SettingsGroup tone="blue" icon={Cloud} title={t("remote.title")} description={t("remote.description")}>
        <SettingsField label={t("remote.storage")} icon={Cloud} hint={storages.length === 0 ? t("remote.noStorages") : undefined} wide>
          <Select<string> value={remote.storageId ?? NONE} onValueChange={(id) => id && setRemote({ storageId: id === NONE ? null : id })}>
            <SelectTrigger className="w-full md:w-80" aria-label={t("remote.storage")}>
              <SelectValue>{(id: string) => (id === NONE ? t("remote.noStorage") : (storages.find((s) => s.id === id)?.name ?? id))}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE}>{t("remote.noStorage")}</SelectItem>
              {storages.map((storage) => (
                <SelectItem key={storage.id} value={storage.id}>
                  {storage.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SettingsField>
        <fieldset disabled={!hasStorage} className="contents [&:disabled_*]:cursor-not-allowed">
          <SettingsField label={t("remote.uploadMode")} icon={CloudUpload} wide>
            <ToggleGroup
              variant="segmented"
              value={[remote.uploadMode]}
              onValueChange={(next) => next[0] && setRemote({ uploadMode: next[0] as BackupUploadMode })}
            >
              <Toggle variant="segmented" value="auto" disabled={!hasStorage}>
                {t("remote.auto")}
              </Toggle>
              <Toggle variant="segmented" value="manual" disabled={!hasStorage}>
                {t("remote.manual")}
              </Toggle>
            </ToggleGroup>
          </SettingsField>
          <LimitFields limits={remote} onChange={(limits) => setRemote(limits)} disabled={!hasStorage} />
          <SettingsField label={t("remote.deleteLocal")} icon={Trash2} hint={t("remote.deleteLocalHint")} inline wide>
            <Switch
              checked={remote.deleteLocalAfterUpload}
              disabled={!hasStorage || remote.uploadMode !== "auto"}
              onCheckedChange={(deleteLocalAfterUpload) => setRemote({ deleteLocalAfterUpload })}
              aria-label={t("remote.deleteLocal")}
            />
          </SettingsField>
        </fieldset>
      </SettingsGroup>
    </>
  );
}

function LimitFields({ limits, onChange, disabled }: { limits: RetentionLimits; onChange: (next: RetentionLimits) => void; disabled?: boolean }) {
  const { t } = useTranslation("modules.backups.policy");
  const id = useId();
  return (
    <>
      <SettingsField label={t("keepCount")} icon={Layers} htmlFor={`${id}-count`}>
        <LimitInput
          id={`${id}-count`}
          value={limits.keepCount}
          unit={t("keepCountUnit")}
          disabled={disabled}
          onChange={(keepCount) => onChange({ ...limits, keepCount })}
        />
      </SettingsField>
      <SettingsField label={t("keepDays")} icon={CalendarDays} htmlFor={`${id}-days`}>
        <LimitInput
          id={`${id}-days`}
          value={limits.keepDays}
          unit={t("keepDaysUnit")}
          disabled={disabled}
          onChange={(keepDays) => onChange({ ...limits, keepDays })}
        />
      </SettingsField>
    </>
  );
}

function LimitInput({
  id,
  value,
  unit,
  disabled,
  onChange,
}: {
  id: string;
  value: number | null;
  unit: string;
  disabled?: boolean;
  onChange: (next: number | null) => void;
}) {
  const { t } = useTranslation("modules.backups.policy");
  return (
    <InputGroup>
      <InputGroupInput
        id={id}
        type="number"
        min={1}
        inputMode="numeric"
        className="num"
        placeholder={t("unlimited")}
        disabled={disabled}
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
