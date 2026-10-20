import { useValidateJavaPathMutation } from "@/modules/java-manager/api/java.queries";
import { useJavaVersionOptions } from "@/modules/server/hooks";
import { useLanguageContext } from "@/shared/context/language-context";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { CheckCircle2, FolderSearch, Loader2, Star, XCircle } from "lucide-react";
import { UserPermissions } from "@shared/types/user.types";
import { useEffect, useState } from "react";

/** Select value for the manual path entry mode */
const MANUAL_OPTION = "__custom_path";

interface JavaVersionFieldProps {
  label: string;
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
  label,
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

  const [manualMode, setManualMode] = useState(false);
  const [manualPath, setManualPath] = useState("");
  const [manualError, setManualError] = useState<string | null>(null);
  const validateMutation = useValidateJavaPathMutation();
  // Arbitrary paths need MANAGE_JAVA on the backend, others pick from the registry only
  const canEnterPath = useAuthStore((s) =>
    s.hasPermission(UserPermissions.MANAGE_JAVA)
  );

  const registryMatch = pathValue
    ? custom.find((o) => o.path === pathValue)
    : undefined;

  // A saved path that is not a registered installation opens the manual editor prefilled
  useEffect(() => {
    if (!isLoading && pathValue && !registryMatch) {
      setManualMode(true);
      setManualPath(pathValue);
    }
  }, [isLoading, pathValue, registryMatch]);

  // Explicit manual mode wins so a registered pick can be switched to a typed path
  const selectValue = manualMode
    ? MANUAL_OPTION
    : registryMatch
      ? registryMatch.version
      : pathValue
        ? MANUAL_OPTION
        : String(value ?? "");
  const showManualOption =
    !!onPathChange && (canEnterPath || selectValue === MANUAL_OPTION);

  // Trigger labels for synthetic values, managed majors keep their raw value
  const selectLabels: Record<string, string> = {
    [MANUAL_OPTION]: t("modules.newServerModal.java.version.manual.option"),
  };
  for (const o of custom) selectLabels[o.version] = o.label;

  const handleSelect = (v: string | null) => {
    if (v == null) return;
    setManualError(null);
    if (v === MANUAL_OPTION) {
      setManualMode(true);
      return;
    }
    setManualMode(false);
    setManualPath("");
    const customOption = custom.find((o) => o.version === v);
    if (customOption?.path) {
      onPathChange?.(customOption.path);
      return;
    }
    if (pathValue) onPathChange?.("");
    onChange(Number(v));
  };

  // Validate the typed path and apply it as the JAVA_PATH override on success
  const handleApplyManual = async () => {
    const trimmed = manualPath.trim();
    if (!trimmed) return;
    setManualError(null);
    try {
      const result = await validateMutation.mutateAsync(trimmed);
      if (!result.valid) {
        setManualError(
          result.error || t("modules.newServerModal.java.version.manual.invalid")
        );
        return;
      }
      onPathChange?.(trimmed);
    } catch (error) {
      setManualError(
        error instanceof Error
          ? error.message
          : t("modules.newServerModal.java.version.manual.invalid")
      );
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {isResolving ? (
        <div className="flex h-10 items-center gap-2 rounded-md border border-dashed border-muted bg-muted/40 px-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("modules.newServerModal.java.version.resolving")}
        </div>
      ) : isLoading ? (
        <div className="flex h-10 items-center gap-2 rounded-md border border-dashed border-muted bg-muted/40 px-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          Loading Java versions
        </div>
      ) : (
        <Select
          items={selectLabels}
          value={selectValue}
          onValueChange={handleSelect}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Java version" />
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
              <SelectItem value={MANUAL_OPTION}>
                <span className="flex items-center gap-2">
                  <FolderSearch className="size-3.5" />
                  {t("modules.newServerModal.java.version.manual.option")}
                </span>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      )}

      {onPathChange && selectValue === MANUAL_OPTION && (
        <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
          <div className="flex gap-2">
            <Input
              value={manualPath}
              disabled={!canEnterPath}
              placeholder={t(
                "modules.newServerModal.java.version.manual.placeholder"
              )}
              onChange={(e) => {
                setManualPath(e.target.value);
                setManualError(null);
              }}
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleApplyManual}
              disabled={
                !canEnterPath ||
                !manualPath.trim() ||
                validateMutation.isPending
              }
            >
              {validateMutation.isPending ? (
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
            <p className="flex items-start gap-1.5 text-sm text-green-600 dark:text-green-400">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
              {t("modules.newServerModal.java.version.manual.applied")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
