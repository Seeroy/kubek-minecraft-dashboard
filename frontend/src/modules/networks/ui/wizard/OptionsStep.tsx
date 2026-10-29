"use client";
import { NEW_BACKEND_REF } from "@/api";
import { WizardSection } from "@/modules/server/modals/CreateServerModal/wizard/WizardField";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Checkbox } from "@/shared/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { ArrowDown, ArrowUp, ChevronRight, CircleHelp, History, ListOrdered, ShieldCheck, Sparkles, TriangleAlert } from "lucide-react";
import { orderedRefs, sharedModes } from "../../lib/wizard-draft";
import type { StepProps } from "./ProxyStep";

const MODES = ["auto", "modern", "legacy"] as const;
const ICONS = { auto: Sparkles, modern: ShieldCheck, legacy: History } as const;

export function OptionsStep({ draft, update, candidates, panel }: StepProps) {
  const { t } = useTranslation("modules.networks.options");
  const modes = sharedModes(draft, candidates);
  const detected = modes[0];
  const conflict = !detected || (draft.mode !== "auto" && !modes.includes(draft.mode));

  return (
    <div>
      <WizardSection icon={ShieldCheck} tone="purple" title={t("mode")}>
        <div role="radiogroup" aria-label={t("mode")} className="grid gap-2 sm:grid-cols-3">
          {MODES.map((mode) => {
            const Icon = ICONS[mode];
            const unavailable = mode !== "auto" && !modes.includes(mode);
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={draft.mode === mode}
                disabled={unavailable}
                onClick={() => update({ mode })}
                className="grid content-start gap-1 rounded-lg border border-border bg-card p-3 text-left transition-[border-color,background-color] duration-150 ease-smooth outline-none hover:border-foreground/20 focus-visible:border-primary/60 disabled:pointer-events-none disabled:opacity-50 aria-checked:border-primary/60 aria-checked:bg-primary/6"
              >
                <span className="flex items-center gap-2 text-[13.5px] font-semibold">
                  <Icon className="size-3.5 text-muted-foreground" />
                  {t(mode)}
                  {mode === "auto" && detected && <Badge variant="secondary">{t(detected)}</Badge>}
                </span>
                <span className="text-xs text-muted-foreground">{unavailable ? t("unavailable") : t(`${mode}Hint`)}</span>
              </button>
            );
          })}
        </div>
        {conflict && (
          <Alert className="mt-3">
            <TriangleAlert className="text-warn" />
            <AlertDescription>{t("unsupported")}</AlertDescription>
          </Alert>
        )}
        <ModeExplainer />
      </WizardSection>

      <WizardSection icon={ListOrdered} tone="blue" title={t("order")}>
        <p className="mb-3 text-xs text-muted-foreground">{t("orderHint")}</p>
        <TryOrder draft={draft} update={update} candidates={candidates} panel={panel} />
      </WizardSection>
    </div>
  );
}

const ROWS = ["how", "security", "versions", "servers", "firewall"] as const;

/** Side by side comparison of the two forwarding modes */
function ModeExplainer() {
  const { t } = useTranslation("modules.networks.options.explain");
  return (
    <Collapsible className="mt-3 overflow-hidden rounded-lg border border-border bg-card">
      <CollapsibleTrigger className="group flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium outline-none hover:bg-hover focus-visible:bg-hover">
        <ChevronRight className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 ease-smooth group-aria-expanded:rotate-90" />
        <CircleHelp className="size-3.5 shrink-0 text-muted-foreground" />
        {t("title")}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border text-[12.5px]">
          <div className="grid grid-cols-[minmax(90px,0.7fr)_1fr_1fr] gap-x-3 border-b border-border bg-subtle px-3 py-2 text-xs font-semibold">
            <span />
            <span>Modern</span>
            <span>Legacy</span>
          </div>
          {ROWS.map((row) => (
            <div key={row} className="grid grid-cols-[minmax(90px,0.7fr)_1fr_1fr] gap-x-3 px-3 py-2 not-last:border-b not-last:border-border">
              <span className="font-medium">{t(`${row}.label`)}</span>
              <span className="text-muted-foreground">{t(`${row}.modern`)}</span>
              <span className="text-muted-foreground">{t(`${row}.legacy`)}</span>
            </div>
          ))}
          <p className="border-t border-border bg-subtle px-3 py-2 text-xs text-muted-foreground">{t("summary")}</p>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function TryOrder({ draft, update, candidates }: StepProps) {
  const { t } = useTranslation("modules.networks.options");
  const refs = orderedRefs(draft);
  const included = refs.filter((ref) => !draft.excluded.includes(ref));

  const nameOf = (ref: string) =>
    ref.startsWith(NEW_BACKEND_REF)
      ? (draft.newServers.find((s) => ref === `${NEW_BACKEND_REF}${s.key}`)?.name.trim() ?? ref)
      : (candidates?.backends.find((b) => b.serverId === ref)?.name ?? ref);

  const move = (index: number, by: number) => {
    const next = [...refs];
    [next[index], next[index + by]] = [next[index + by], next[index]];
    update({ order: next });
  };

  const toggle = (ref: string) => update({ excluded: draft.excluded.includes(ref) ? draft.excluded.filter((r) => r !== ref) : [...draft.excluded, ref] });

  return (
    <ol className="grid gap-2">
      {refs.map((ref, index) => (
        <li
          key={ref}
          data-excluded={draft.excluded.includes(ref) || undefined}
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2 data-excluded:opacity-60"
        >
          <Checkbox checked={!draft.excluded.includes(ref)} onCheckedChange={() => toggle(ref)} aria-label={`${t("inTry")}: ${nameOf(ref)}`} />
          <span className="w-5 text-center text-xs text-muted-foreground tabular-nums">{index + 1}</span>
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{nameOf(ref)}</span>
          {ref.startsWith(NEW_BACKEND_REF) && <Badge variant="secondary">{t("newServer")}</Badge>}
          {included[0] === ref && <Badge variant="success">{t("default")}</Badge>}
          <Button size="icon-sm" variant="ghost" disabled={index === 0} onClick={() => move(index, -1)} aria-label={t("up")} title={t("up")}>
            <ArrowUp />
          </Button>
          <Button size="icon-sm" variant="ghost" disabled={index === refs.length - 1} onClick={() => move(index, 1)} aria-label={t("down")} title={t("down")}>
            <ArrowDown />
          </Button>
        </li>
      ))}
    </ol>
  );
}
