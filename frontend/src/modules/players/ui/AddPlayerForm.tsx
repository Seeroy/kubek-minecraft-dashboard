"use client";
import type { ResolvedPlayer } from "@/api";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { PlayerHead } from "@/shared/ui/player-head";
import { Spinner } from "@/shared/ui/spinner";
import { BadgeCheck, Search, type LucideIcon } from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import { useResolvePlayerMutation } from "../api/players.queries";
import { usePlayersError } from "../hooks/usePlayersError";
import { PLAYER_NAME } from "../lib/players";

interface AddPlayerFormProps {
  serverId: string;
  submitLabel: string;
  submitIcon: LucideIcon;
  disabled?: boolean;
  /** Extra controls next to the name, level or reason */
  extra?: ReactNode;
  onSubmit: (player: ResolvedPlayer) => Promise<boolean>;
}

/** Name first, then a check against the server's UUID rules, then the actual change */
export function AddPlayerForm({ serverId, submitLabel, submitIcon: SubmitIcon, disabled, extra, onSubmit }: AddPlayerFormProps) {
  const { t } = useTranslation("modules.players.add");
  const errorText = usePlayersError();
  const resolve = useResolvePlayerMutation(serverId);
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const trimmed = name.trim();
  const invalid = trimmed !== "" && !PLAYER_NAME.test(trimmed);
  // A result only counts for the name it was asked for
  const checked = resolve.data && resolve.variables?.toLowerCase() === trimmed.toLowerCase() ? resolve.data : null;
  const failed = resolve.isError && resolve.variables === trimmed;
  const busy = resolve.isPending || submitting;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || invalid || busy || disabled) return;
    if (!checked) {
      resolve.mutate(trimmed);
      return;
    }
    setSubmitting(true);
    const ok = await onSubmit(checked);
    setSubmitting(false);
    if (ok) {
      setName("");
      resolve.reset();
    }
  };

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-2.5 border-b border-border px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <InputGroup className="w-full sm:w-64">
          <InputGroupAddon>{checked ? <PlayerHead name={checked.name} size={16} /> : <Search className="size-3.5" />}</InputGroupAddon>
          <InputGroupInput
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            aria-invalid={invalid || failed || undefined}
            autoComplete="off"
            spellCheck={false}
            maxLength={17}
            disabled={disabled}
          />
        </InputGroup>
        {extra}
        <Button type="submit" variant={checked ? "default" : "outline"} disabled={!trimmed || invalid || busy || disabled}>
          {busy ? <Spinner /> : checked ? <SubmitIcon /> : <BadgeCheck />}
          {checked ? submitLabel : resolve.isPending ? t("checking") : t("check")}
        </Button>
      </div>

      {invalid && <p className="text-[12.5px] text-danger">{t("invalid")}</p>}
      {failed && <p className="text-[12.5px] text-danger">{errorText(resolve.error)}</p>}

      {checked && (
        <div className="flex animate-in items-center gap-3 rounded-md border border-border bg-secondary px-3 py-2 duration-200 fade-in">
          <PlayerHead name={checked.name} size={28} className="rounded-md" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-medium">{checked.name}</div>
            <div className="truncate font-mono text-[11.5px] text-muted-foreground">{checked.uuid}</div>
          </div>
          <Badge variant={checked.source === "mojang" ? "success" : "secondary"} title={checked.source === "offline" ? t("offlineHint") : undefined}>
            {t(checked.source)}
          </Badge>
        </div>
      )}
    </form>
  );
}
