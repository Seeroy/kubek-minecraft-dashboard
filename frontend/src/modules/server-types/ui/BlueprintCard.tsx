"use client";

import { useLanguageContext } from "@/shared/context/language-context";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { BlueprintIcon } from "@/shared/ui/BlueprintIcon";
import { Button } from "@/shared/ui/button";
import { Trash2 } from "lucide-react";

// The bundled blueprint id suffix matches the core icon asset name (paper, purpur, ...)
const iconType = (id: string) => id.split(".").pop() ?? "custom";

interface Props {
  blueprint: BlueprintSummary;
  busy: boolean;
  onRemove: () => void;
}

export const BlueprintCard = ({ blueprint, busy, onRemove }: Props) => {
  const { t } = useLanguageContext();

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card/40 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <BlueprintIcon
            icon={blueprint.icon}
            coreType={iconType(blueprint.id)}
            label={blueprint.name}
            className="size-5"
          />
          <span className="leading-none font-medium">{blueprint.name}</span>
        </div>
        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground uppercase">
          {t(`modules.serverTypes.source.${blueprint.source}`)}
        </span>
      </div>

      {blueprint.description && (
        <p className="text-xs text-muted-foreground">{blueprint.description}</p>
      )}

      <div className="mt-auto flex items-center justify-between pt-2">
        <span className="text-xs text-muted-foreground">
          v{blueprint.version}
        </span>
        {blueprint.source === "installed" && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            disabled={busy}
            onClick={onRemove}
          >
            <Trash2 className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
