import { FEATURE_TONE, iconType } from "@/modules/server-types/lib/blueprint";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { BlueprintIcon } from "@/shared/ui/BlueprintIcon";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/shared/ui/input-group";
import { Skeleton } from "@/shared/ui/skeleton";
import { toneClass } from "@/shared/ui/tone";
import { Check, Package, Search, SearchX } from "lucide-react";
import { useState } from "react";

// Only content features tell server types apart, the rest every blueprint has
const CONTENT_FEATURES = new Set(["plugins:modrinth", "mods:fabric"]);

interface TypeStepProps {
  blueprints: BlueprintSummary[];
  loading: boolean;
  error: boolean;
  selectedId: string;
  onSelect: (bp: BlueprintSummary) => void;
  onConfirm: () => void;
  /** Opens the modpack import instead of a bare server */
  onImportModpack: () => void;
}

export function TypeStep({ blueprints, loading, error, selectedId, onSelect, onConfirm, onImportModpack }: TypeStepProps) {
  const { t } = useTranslation("modules.newServerModal");
  const { t: tf } = useTranslation("modules.serverTypes.features");
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? blueprints.filter((bp) => `${bp.name} ${bp.id} ${bp.description ?? ""}`.toLowerCase().includes(needle))
    : blueprints;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-primary/25 bg-primary/6 px-3 py-2.5">
        <Package className="size-4 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 text-[13px]">
          <b className="font-semibold">{t("type.modpack.title")}</b> <span className="text-muted-foreground">{t("type.modpack.text")}</span>
        </span>
        <Button variant="outline" size="sm" onClick={onImportModpack}>
          {t("type.modpack.action")}
        </Button>
      </div>

      <InputGroup className="max-w-80">
        <InputGroupAddon>
          <Search className="size-3.5" />
        </InputGroupAddon>
        <InputGroupInput autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("type.search")} />
      </InputGroup>

      {error && (
        <p className="mt-3 rounded-md border border-danger/30 bg-danger/8 px-3 py-2 text-danger">{t("modal.notifications.catalogError")}</p>
      )}

      {loading ? (
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-[118px] rounded-lg" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchX />
            </EmptyMedia>
            <EmptyTitle>{t("type.nothing")}</EmptyTitle>
            {needle && <EmptyDescription>{t("type.nothingHint", query.trim())}</EmptyDescription>}
          </EmptyHeader>
        </Empty>
      ) : (
        <div role="radiogroup" aria-label={t("steps.type.label")} className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(190px,1fr))] gap-3">
          {shown.map((bp) => {
            const selected = bp.id === selectedId;
            const features = bp.features.filter((feature) => CONTENT_FEATURES.has(feature));
            return (
              <button
                key={bp.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onSelect(bp)}
                onDoubleClick={onConfirm}
                className="relative grid cursor-pointer content-start gap-1.5 rounded-lg border border-border bg-card p-3 text-left transition-[border-color,background-color,translate,box-shadow] duration-150 outline-none hover:-translate-y-px hover:border-foreground/20 focus-visible:ring-3 focus-visible:ring-primary/18 aria-checked:border-primary/65 aria-checked:bg-primary/7 aria-checked:shadow-[0_0_0_3px_color-mix(in_oklch,var(--primary)_14%,transparent)]"
              >
                {selected && (
                  <span className="absolute top-2.5 right-2.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                )}
                <span className="flex min-w-0 items-center gap-2.5 pr-6">
                  <BlueprintIcon icon={bp.icon} coreType={iconType(bp.id)} label={bp.name} className="size-[34px] rounded-lg" />
                  <span className="min-w-0">
                    <b className="block truncate text-sm font-semibold">{bp.shortName ?? bp.name}</b>
                    <span className="block truncate font-mono text-[11px] text-muted-foreground">{bp.id}</span>
                  </span>
                </span>
                {bp.description && <span className="line-clamp-2 text-xs leading-snug text-muted-foreground">{bp.description}</span>}
                {(features.length > 0 || bp.dockerCapable) && (
                  <span className="flex flex-wrap gap-1">
                    {features.map((feature) => (
                      <Badge key={feature} className={cn("bg-tone/12 text-tone", toneClass[FEATURE_TONE[feature]])}>
                        {tf(feature)}
                      </Badge>
                    ))}
                    {bp.dockerCapable && <Badge variant="secondary">Docker</Badge>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
