import type { PluginInstallDependencyInput } from "@/api";
import type { Translator } from "@/locales/types";
import { Label } from "@/shared/ui/label";
import { ScrollArea } from "@/shared/ui/scroll-area";
import { Switch } from "@/shared/ui/switch";
import { CheckCircle2, Puzzle } from "lucide-react";

interface DependenciesCardProps {
  installableDependencies: PluginInstallDependencyInput[];
  autoInstallDeps: boolean;
  onAutoInstallDepsChange: (checked: boolean) => void;
  isSubmitting: boolean;
  t: Translator;
}

export function DependenciesCard({
  installableDependencies,
  autoInstallDeps,
  onAutoInstallDepsChange,
  isSubmitting,
  t,
}: DependenciesCardProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-background p-3">
      <div className="mb-2 flex items-center justify-between">
        <Label className="flex items-center gap-2 text-sm font-medium">
          <Puzzle className="h-4 w-4" />
          {t("sections.installDependencies")}
        </Label>
        <Switch
          id="auto-deps"
          checked={autoInstallDeps}
          disabled={!installableDependencies.length || isSubmitting}
          onCheckedChange={onAutoInstallDepsChange}
        />
      </div>

      {installableDependencies.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t("sections.requiredDependencies", installableDependencies.length)}
          </p>
          <ScrollArea className="h-16">
            <div className="space-y-1">
              {installableDependencies.map((dep) => (
                <div
                  key={`${dep.projectId}:${dep.versionId}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  <span className="truncate">{dep.projectId}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          {t("sections.noAutoDependencies")}
        </p>
      )}
    </div>
  );
}
