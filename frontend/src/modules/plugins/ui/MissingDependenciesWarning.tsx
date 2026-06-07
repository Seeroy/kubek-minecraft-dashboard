import type { Translator } from "@/locales/types";
import { Badge } from "@/shared/ui/badge";
import { ShieldAlert, XCircle } from "lucide-react";

interface MissingDependency {
  projectId?: string;
  versionId?: string;
}

interface MissingDependenciesWarningProps {
  missingDependencies: MissingDependency[];
  t: Translator;
}

export function MissingDependenciesWarning({
  missingDependencies,
  t,
}: MissingDependenciesWarningProps) {
  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" />
        <div className="flex-1">
          <p className="mb-1 text-sm font-medium text-amber-500">
            {t("sections.manualDependenciesTitle")}
          </p>
          <p className="text-xs text-amber-600/90">
            {t("sections.manualDependenciesDescription")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {missingDependencies.slice(0, 5).map((dep, index) => (
              <Badge
                key={`${dep.projectId ?? "unknown"}:${index}`}
                variant="outline"
                className="border-amber-500/30 bg-amber-500/10 text-xs text-amber-700"
              >
                <XCircle className="mr-1 h-3 w-3" />
                {dep.projectId ?? t("sections.unknownProject")}
              </Badge>
            ))}
            {missingDependencies.length > 5 && (
              <Badge variant="outline" className="text-xs">
                {t("sections.moreCount", missingDependencies.length - 5)}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
