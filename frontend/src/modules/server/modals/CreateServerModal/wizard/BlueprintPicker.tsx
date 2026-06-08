import { useLanguageContext } from "@/shared/context/language-context";
import { cn } from "@/shared/lib/cn";
import type { BlueprintSummary } from "@/shared/types/server-types.types";
import { BlueprintIcon } from "@/shared/ui/BlueprintIcon";
import { Loader2 } from "lucide-react";

// The bundled blueprint id suffix matches the core icon asset name (paper, purpur, ...)
const iconType = (id: string) => id.split(".").pop() ?? "custom";

interface BlueprintPickerProps {
  blueprints: BlueprintSummary[];
  selectedId: string | undefined;
  onSelect: (bp: BlueprintSummary) => void;
  isLoading?: boolean;
}

export function BlueprintPicker({
  blueprints,
  selectedId,
  onSelect,
  isLoading,
}: BlueprintPickerProps) {
  const { t } = useLanguageContext();

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t("modules.newServerModal.blueprint.loadingTypes")}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {blueprints.map((bp) => {
        const isActive = bp.id === selectedId;
        return (
          <button
            type="button"
            key={bp.id}
            onClick={() => onSelect(bp)}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
              isActive
                ? "border-primary/50 bg-primary/5"
                : "border-border bg-card/40 hover:border-primary/30 hover:bg-accent/40"
            )}
          >
            <div className="flex items-center gap-2">
              <BlueprintIcon
                icon={bp.icon}
                coreType={iconType(bp.id)}
                label={bp.name}
                className="size-5"
              />
              <span className="leading-none font-medium">
                {bp.shortName ?? bp.name}
              </span>
            </div>
            {bp.description && (
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {bp.description}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
