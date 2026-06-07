import type { Translator } from "@/locales/types";
import { Badge } from "@/shared/ui/badge";
import { Label } from "@/shared/ui/label";
import { ModrinthVersion } from "@shared/types/plugins";
import { Calendar, Puzzle } from "lucide-react";

interface CompatibilityCardProps {
  version: ModrinthVersion;
  t: Translator;
}

export function CompatibilityCard({ version, t }: CompatibilityCardProps) {
  return (
    <div className="rounded-lg border border-border/50 bg-background p-3">
      <Label className="mb-2 flex items-center gap-2 text-sm font-medium">
        <Puzzle className="h-4 w-4" />
        {t("sections.compatibility")}
      </Label>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {version.game_versions.slice(0, 3).map((gameVersion) => (
            <Badge key={gameVersion} variant="outline" className="text-xs">
              {gameVersion}
            </Badge>
          ))}
          {version.loaders.map((loader) => (
            <Badge key={loader} variant="secondary" className="text-xs">
              {loader}
            </Badge>
          ))}
          {version.game_versions.length > 3 && (
            <Badge variant="outline" className="text-xs">
              {t("sections.moreCount", version.game_versions.length - 3)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {new Date(version.date_published).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
}
