"use client";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { Spinner } from "@/shared/ui/spinner";
import { Ban, Globe } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { isIpAddress } from "../lib/players";

interface IpBanFormProps {
  disabled?: boolean;
  extra?: ReactNode;
  onSubmit: (ip: string) => Promise<boolean>;
}

export function IpBanForm({ disabled, extra, onSubmit }: IpBanFormProps) {
  const { t } = useTranslation("modules.players.bans");
  const [ip, setIp] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const trimmed = ip.trim();
  const invalid = trimmed !== "" && !isIpAddress(trimmed);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || invalid || submitting || disabled) return;
    setSubmitting(true);
    const ok = await onSubmit(trimmed);
    setSubmitting(false);
    if (ok) setIp("");
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-2.5 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-64">
          <InputGroupAddon>
            <Globe className="size-3.5" />
          </InputGroupAddon>
          <InputGroupInput
            value={ip}
            onChange={(event) => setIp(event.target.value)}
            placeholder={t("ipPlaceholder")}
            aria-label={t("ipPlaceholder")}
            aria-invalid={invalid || undefined}
            autoComplete="off"
            spellCheck={false}
            className="font-mono"
            disabled={disabled}
          />
        </InputGroup>
        {extra}
        <Button type="submit" disabled={!trimmed || invalid || submitting || disabled}>
          {submitting ? <Spinner /> : <Ban />}
          {t("add")}
        </Button>
      </div>
      {invalid && <p className="text-[12.5px] text-danger">{t("ipInvalid")}</p>}
    </form>
  );
}
