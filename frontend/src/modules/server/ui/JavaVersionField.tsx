import { useJavaVersionOptions } from "@/modules/server/hooks";
import { JAVA_MANUAL_OPTION, useJavaPathChoice } from "@/modules/server/hooks/useJavaPathChoice";
import { useLanguageContext } from "@/shared/context/language-context";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DataReveal } from "@/shared/ui/data-reveal";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { CheckCircle2, FolderSearch, Loader2, Star, XCircle } from "lucide-react";
import { AccessArea } from "@shared/access/areas";

interface JavaVersionFieldProps {
  value: number | string | undefined;
  onChange: (value: number) => void;
  /** Current JAVA_PATH override, empty when a managed version is used */
  pathValue?: string;
  /** Apply a custom Java path ("" clears the override); hides custom options when absent */
  onPathChange?: (path: string) => void;
  /** True while the recommended Java for the selected game version is being resolved */
  isResolving?: boolean;
  /** Major Java version recommended for the selected game version; gets a star badge in the list */
  recommendedVersion?: number | null;
}

export function JavaVersionField({
  value,
  onChange,
  pathValue,
  onPathChange,
  isResolving,
  recommendedVersion,
}: JavaVersionFieldProps) {
  const { t } = useLanguageContext();
  const { options, isLoading } = useJavaVersionOptions();
  const managed = options.filter((o) => o.managed);
  const custom = onPathChange ? options.filter((o) => o.custom) : [];

  const java = useJavaPathChoice({ path: pathValue, onPathChange, onChange, custom, isLoading });
  // Arbitrary paths need java manage on the backend, others pick from the registry only
  const canEnterPath = useAuthStore((s) => s.can(AccessArea.JAVA, "manage"));
  const manualPath = java.typed;
  const manualError = java.error;

  // Explicit manual mode wins so a registered pick can be switched to a typed path
  const selectValue = java.manual
    ? JAVA_MANUAL_OPTION
    : java.registered
      ? java.registered.version
      : pathValue
        ? JAVA_MANUAL_OPTION
        : String(value ?? "");
  const showManualOption =
    !!onPathChange && (canEnterPath || selectValue === JAVA_MANUAL_OPTION);

  // Trigger labels for synthetic values, managed majors keep their raw value
  const selectLabels: Record<string, string> = {
    [JAVA_MANUAL_OPTION]: t("modules.newServerModal.java.version.manual.option"),
  };
  for (const o of custom) selectLabels[o.version] = o.label;

  const handleSelect = (v: string | null) => {
    if (v == null) return;
    // A picked version drops whatever was typed before
    if (v !== JAVA_MANUAL_OPTION) java.editPath("");
    java.select(v);
  };

  return (
    <div className="space-y-2">
      {/* Only the trigger is measured, so the options list itself needs no sample */}
      <DataReveal
        id="java-version-field"
        data={options}
        loading={isResolving || isLoading}
        label={t(isResolving ? "modules.newServerModal.java.version.resolving" : "modules.newServerModal.java.version.loading")}
        sample={[]}
      >
        {() => (
            <Select
              items={selectLabels}
              value={selectValue}
              onValueChange={handleSelect}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("modules.newServerModal.java.version.placeholder")} />
              </SelectTrigger>
              <SelectContent>
                {managed.map((o) => (
                  <SelectItem key={o.version} value={o.version}>
                    <span className="flex items-center gap-2">
                      {o.label}
                      {recommendedVersion != null &&
                        Number(o.version) === recommendedVersion && (
                          <Badge
                            variant="warning"
                            className="size-4 px-0"
                            title={t(
                              "modules.newServerModal.java.version.badges.recommended"
                            )}
                          >
                            <Star className="!size-2 fill-current" />
                          </Badge>
                        )}
                      {o.installed && (
                        <Badge variant="success" className="h-4 px-1.5 text-[10px]">
                          {t(
                            "modules.newServerModal.java.version.badges.installed"
                          )}
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
                {custom.map((o) => (
                  <SelectItem key={o.version} value={o.version}>
                    <span className="flex items-center gap-2">
                      {o.label}
                      <Badge variant="secondary" className="h-4 px-1.5 text-[10px]">
                        {t("modules.newServerModal.java.version.badges.custom")}
                      </Badge>
                    </span>
                  </SelectItem>
                ))}
                {showManualOption && (
                  <SelectItem value={JAVA_MANUAL_OPTION}>
                    <span className="flex items-center gap-2">
                      <FolderSearch className="size-3.5" />
                      {t("modules.newServerModal.java.version.manual.option")}
                    </span>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
        )}
      </DataReveal>

      {onPathChange && selectValue === JAVA_MANUAL_OPTION && (
        <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
          <div className="flex gap-2">
            <Input
              value={manualPath}
              disabled={!canEnterPath}
              placeholder={t(
                "modules.newServerModal.java.version.manual.placeholder"
              )}
              onChange={(e) => java.editPath(e.target.value)}
            />
            <Button
              type="button"
              variant="outline"
              onClick={java.apply}
              disabled={
                !canEnterPath ||
                !manualPath.trim() ||
                java.validating
              }
            >
              {java.validating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                t("modules.newServerModal.java.version.manual.apply")
              )}
            </Button>
          </div>
          {manualError && (
            <p className="flex items-start gap-1.5 text-sm text-destructive">
              <XCircle className="mt-0.5 size-3.5 shrink-0" />
              {manualError}
            </p>
          )}
          {!manualError && pathValue && pathValue === manualPath.trim() && (
            <p className="flex items-start gap-1.5 text-sm text-success">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
              {t("modules.newServerModal.java.version.manual.applied")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
