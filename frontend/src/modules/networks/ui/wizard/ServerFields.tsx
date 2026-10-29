"use client";
import { WizardField } from "@/modules/server/modals/CreateServerModal/wizard/WizardField";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Input } from "@/shared/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/shared/ui/input-group";
import { Cpu, Network, Tag } from "lucide-react";
import type { NameIssue, PortIssue } from "../../lib/wizard-draft";

export const digits = (value: string) => Number(value.replace(/\D/g, "")) || 0;

interface NameFieldProps {
  id: string;
  label: string;
  value: string;
  issue: NameIssue | undefined;
  onChange: (value: string) => void;
}

export function NameField({ id, label, value, issue, onChange }: NameFieldProps) {
  const { t } = useTranslation("modules.networks.fields");
  return (
    <WizardField label={label} icon={Tag} htmlFor={id} error={issue && t(`name.${issue}`, value.trim())}>
      <Input id={id} value={value} maxLength={60} autoComplete="off" aria-invalid={!!issue} onChange={(event) => onChange(event.target.value)} />
    </WizardField>
  );
}

interface PortFieldProps {
  id: string;
  value: string;
  /** Shown as the placeholder, the panel takes it or the next free one */
  auto: number;
  issue: PortIssue | undefined;
  owner: string | undefined;
  onChange: (value: string) => void;
}

export function PortField({ id, value, auto, issue, owner, onChange }: PortFieldProps) {
  const { t } = useTranslation("modules.networks.fields");
  return (
    <WizardField label={t("port.label")} icon={Network} htmlFor={id} error={issue && t(`port.${issue}`, owner ?? "")} hint={t("port.hint")}>
      <Input
        id={id}
        inputMode="numeric"
        className="font-mono"
        placeholder={t("port.auto", auto)}
        value={value}
        aria-invalid={!!issue}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, "").slice(0, 5))}
      />
    </WizardField>
  );
}

interface MemoryFieldProps {
  id: string;
  value: number;
  min: number;
  onChange: (value: number) => void;
}

export function MemoryField({ id, value, min, onChange }: MemoryFieldProps) {
  const { t } = useTranslation("modules.networks.fields");
  return (
    <WizardField label={t("memory.label")} icon={Cpu} htmlFor={id} error={value < min ? t("memory.min", min) : undefined}>
      <InputGroup>
        <InputGroupInput
          id={id}
          inputMode="numeric"
          className="tabular-nums"
          value={String(value)}
          aria-invalid={value < min}
          onChange={(event) => onChange(digits(event.target.value))}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText>{t("memory.unit")}</InputGroupText>
        </InputGroupAddon>
      </InputGroup>
    </WizardField>
  );
}
