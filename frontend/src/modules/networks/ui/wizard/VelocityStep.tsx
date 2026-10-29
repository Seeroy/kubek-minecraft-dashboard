"use client";
import type { VelocitySettings } from "@/api";
import { SwitchRow } from "@/modules/server/modals/CreateServerModal/wizard/AdvancedStep";
import { WizardField, WizardSection } from "@/modules/server/modals/CreateServerModal/wizard/WizardField";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/shared/ui/input-group";
import {
  Activity,
  ArrowLeftRight,
  Fingerprint,
  Gauge,
  KeyRound,
  LogIn,
  type LucideIcon,
  MessageSquareText,
  Puzzle,
  Radar,
  RotateCcw,
  ScrollText,
  Shield,
  ShieldCheck,
  Timer,
  TriangleAlert,
  UserX,
  Users,
  Wifi,
} from "lucide-react";
import { useState } from "react";
import type { StepProps } from "./ProxyStep";

type BoolKey = {
  [K in keyof VelocitySettings]: VelocitySettings[K] extends boolean ? K : never;
}[keyof VelocitySettings];
type NumberKey = {
  [K in keyof VelocitySettings]: VelocitySettings[K] extends number ? K : never;
}[keyof VelocitySettings];

const SECURITY: [BoolKey, LucideIcon][] = [
  ["onlineMode", ShieldCheck],
  ["forceKeyAuthentication", KeyRound],
  ["preventClientProxyConnections", Fingerprint],
  ["kickExistingPlayers", UserX],
];

const CONNECTION: [NumberKey, LucideIcon, number][] = [
  ["compressionThreshold", Gauge, -1],
  ["loginRatelimit", LogIn, 0],
  ["connectionTimeout", Timer, 1],
  ["readTimeout", Timer, 1],
];

const EXTRA: [BoolKey, LucideIcon][] = [
  ["failoverOnUnexpectedServerDisconnect", ArrowLeftRight],
  ["haproxyProtocol", Wifi],
  ["announceForge", Puzzle],
  ["acceptsTransfers", Activity],
  ["logPlayerConnections", ScrollText],
  ["queryEnabled", Radar],
];

// Numbers may be typed as "-" on the way to a negative one
const toInt = (raw: string) => (/^-?\d+$/.test(raw) ? Number(raw) : null);

export function VelocityStep({ draft, update, candidates }: StepProps) {
  const { t } = useTranslation("modules.networks.velocity");
  // Number inputs keep their own text, a reset remounts them
  const [epoch, setEpoch] = useState(0);
  const existing = draft.proxyMode === "existing" ? candidates?.proxies.find((p) => p.serverId === draft.proxyServerId) : undefined;
  const base = existing?.settings ?? candidates?.velocityDefaults;
  if (!base) return null;

  const value = <K extends keyof VelocitySettings>(key: K): VelocitySettings[K] => (draft.velocity[key] ?? base[key]) as VelocitySettings[K];
  const set = (patch: Partial<VelocitySettings>) => update({ velocity: { ...draft.velocity, ...patch } });
  const touched = Object.keys(draft.velocity).length > 0;

  const number = (key: NumberKey, icon: LucideIcon, min: number) => (
    <WizardField key={key} label={t(`${key}.label`)} icon={icon} htmlFor={`velocity-${key}`} hint={t(`${key}.hint`)}>
      <InputGroup>
        <InputGroupInput
          id={`velocity-${key}`}
          inputMode="numeric"
          className="tabular-nums"
          defaultValue={String(value(key))}
          onChange={(event) => {
            const next = toInt(event.target.value.trim());
            if (next !== null && next >= min) set({ [key]: next });
          }}
        />
        {key !== "compressionThreshold" && (
          <InputGroupAddon align="inline-end">
            <InputGroupText>{t("ms")}</InputGroupText>
          </InputGroupAddon>
        )}
      </InputGroup>
    </WizardField>
  );

  const toggle = ([key, icon]: [BoolKey, LucideIcon]) => (
    <SwitchRow key={key} icon={icon} label={t(`${key}.label`)} description={t(`${key}.hint`)} checked={value(key)} onChange={(next) => set({ [key]: next })} />
  );

  return (
    <div>
      {existing && (
        <Alert className="mb-5">
          <Shield />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{t("existingHint", existing.name)}</span>
            {touched && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  update({ velocity: {} });
                  setEpoch(epoch + 1);
                }}
              >
                <RotateCcw />
                {t("reset")}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      <WizardSection icon={MessageSquareText} tone="cyan" title={t("list")}>
        <div className="grid gap-x-5 gap-y-4 sm:grid-cols-[1fr_180px]">
          <WizardField label={t("motd.label")} icon={MessageSquareText} htmlFor="velocity-motd" hint={t("motd.hint")}>
            <Input id="velocity-motd" className="font-mono" maxLength={1000} value={value("motd")} onChange={(event) => set({ motd: event.target.value })} />
          </WizardField>
          <WizardField label={t("showMaxPlayers.label")} icon={Users} htmlFor="velocity-max" hint={t("showMaxPlayers.hint")}>
            <Input
              id="velocity-max"
              inputMode="numeric"
              className="tabular-nums"
              value={String(value("showMaxPlayers"))}
              onChange={(event) =>
                set({
                  showMaxPlayers: Number(event.target.value.replace(/\D/g, "")) || 0,
                })
              }
            />
          </WizardField>
        </div>
      </WizardSection>

      <WizardSection icon={ShieldCheck} tone="purple" title={t("security")}>
        {SECURITY.map(toggle)}
        {!value("onlineMode") && (
          <Alert className="mt-2">
            <TriangleAlert className="text-warn" />
            <AlertDescription>{t("offlineWarning")}</AlertDescription>
          </Alert>
        )}
      </WizardSection>

      <WizardSection icon={Gauge} tone="blue" title={t("connections")}>
        <div key={epoch} className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
          {CONNECTION.map(([key, icon, min]) => number(key, icon, min))}
        </div>
      </WizardSection>

      <WizardSection icon={Puzzle} tone="orange" title={t("extra")}>
        {EXTRA.map(toggle)}
      </WizardSection>
    </div>
  );
}
