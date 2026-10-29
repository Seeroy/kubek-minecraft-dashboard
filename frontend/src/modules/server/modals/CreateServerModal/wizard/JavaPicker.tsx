import { useValidateJavaPathMutation } from "@/modules/java-manager/api/java.queries";
import { useJavaVersionOptions } from "@/modules/server/hooks";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Skeleton } from "@/shared/ui/skeleton";
import { Spinner } from "@/shared/ui/spinner";
import { AccessArea } from "@shared/access/areas";
import { AlertTriangle, CheckCircle2, FolderSearch, Star, XCircle } from "lucide-react";
import { useState, type ReactNode } from "react";

const MANUAL = "__manual";

interface JavaPickerProps {
  value: number | undefined;
  onChange: (major: number) => void;
  /** Custom Java path override, empty for a managed version */
  path: string;
  /** Absent when paths do not apply, e.g. for Docker servers */
  onPathChange?: (path: string) => void;
  recommended: number | null;
  resolving: boolean;
  /** Core and version the recommendation is for, shown in the mismatch warning */
  coreLabel: string;
}

function Row({ value, children, end }: { value: string; children: ReactNode; end?: ReactNode }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-md border border-border px-2.5 py-2 transition-colors hover:bg-hover has-data-checked:border-primary/60 has-data-checked:bg-primary/6">
      <RadioGroupItem value={value} />
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {end && <span className="flex shrink-0 gap-1">{end}</span>}
    </label>
  );
}

export function JavaPicker({ value, onChange, path, onPathChange, recommended, resolving, coreLabel }: JavaPickerProps) {
  const { t } = useTranslation("modules.newServerModal.java.version");
  const { options, isLoading } = useJavaVersionOptions();
  const canEnterPath = useAuthStore((s) => s.can(AccessArea.JAVA, "manage"));
  const validate = useValidateJavaPathMutation();
  const managed = options.filter((o) => o.managed);
  const custom = onPathChange ? options.filter((o) => o.custom) : [];
  const registered = path ? custom.find((o) => o.path === path) : undefined;
  // null follows the saved path, a path outside the registry opens the manual editor prefilled
  const [choice, setManual] = useState<boolean | null>(null);
  const [typedPath, setTyped] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const unregistered = !isLoading && !!path && !registered;
  const manual = choice ?? unregistered;
  const typed = typedPath ?? (unregistered ? path : "");

  if (resolving || isLoading) {
    return (
      <div className="grid gap-1.5">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-[38px]" />
        ))}
      </div>
    );
  }

  const selected = manual ? MANUAL : (registered?.version ?? String(value ?? ""));

  const select = (next: string) => {
    setError(null);
    if (next === MANUAL) return setManual(true);
    setManual(false);
    const option = custom.find((o) => o.version === next);
    if (option?.path) return onPathChange?.(option.path);
    if (path) onPathChange?.("");
    onChange(Number(next));
  };

  const apply = async () => {
    const candidate = typed.trim();
    setError(null);
    try {
      const result = await validate.mutateAsync(candidate);
      if (result.valid) onPathChange?.(candidate);
      else setError(result.error || t("manual.invalid"));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t("manual.invalid"));
    }
  };

  const mismatch = !path && recommended != null && value != null && value !== recommended;

  return (
    <div className="grid gap-1.5">
      <RadioGroup value={selected} onValueChange={(next) => select(String(next))} aria-label={t("label")} className="gap-1.5">
        {managed.map((o) => (
          <Row
            key={o.version}
            value={o.version}
            end={
              <>
                {Number(o.version) === recommended && (
                  <Badge variant="success">
                    <Star className="fill-current" />
                    {t("badges.recommended")}
                  </Badge>
                )}
                {o.installed && <Badge variant="secondary">{t("badges.installed")}</Badge>}
              </>
            }
          >
            <b className="font-medium">{o.label}</b>
            {o.description && <span className="text-xs text-muted-foreground"> · {o.description}</span>}
          </Row>
        ))}
        {custom.map((o) => (
          <Row key={o.version} value={o.version} end={<Badge variant="secondary">{t("badges.custom")}</Badge>}>
            <b className="font-medium">{o.label}</b>
            <span className="font-mono text-xs text-muted-foreground"> · {o.path}</span>
          </Row>
        ))}
        {onPathChange && canEnterPath && (
          <Row value={MANUAL}>
            <span className="inline-flex items-center gap-2 text-muted-foreground">
              <FolderSearch className="size-3.5" />
              {t("manual.option")}
            </span>
          </Row>
        )}
      </RadioGroup>

      {manual && (
        <div className="grid gap-2 rounded-md border border-border bg-subtle p-2.5">
          <div className="flex gap-2">
            <Input
              value={typed}
              placeholder={t("manual.placeholder")}
              className="font-mono"
              onChange={(event) => {
                setTyped(event.target.value);
                setError(null);
              }}
              onKeyDown={(event) => {
                // Apply the path instead of advancing the wizard
                if (event.key !== "Enter") return;
                event.preventDefault();
                event.stopPropagation();
                if (typed.trim()) void apply();
              }}
            />
            <Button type="button" variant="outline" disabled={!typed.trim() || validate.isPending} onClick={() => void apply()}>
              {validate.isPending ? <Spinner /> : t("manual.apply")}
            </Button>
          </div>
          {error ? (
            <p className="flex items-start gap-1.5 text-xs text-danger">
              <XCircle className="mt-px size-3.5 shrink-0" />
              {error}
            </p>
          ) : (
            path &&
            path === typed.trim() && (
              <p className="flex items-start gap-1.5 text-xs text-success">
                <CheckCircle2 className="mt-px size-3.5 shrink-0" />
                {t("manual.applied")}
              </p>
            )
          )}
        </div>
      )}

      {mismatch && (
        <p className="flex items-start gap-1.5 text-xs text-warn">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          {t("mismatch", coreLabel, recommended)}
          {value < recommended && `. ${t("tooOld")}`}
        </p>
      )}
    </div>
  );
}
