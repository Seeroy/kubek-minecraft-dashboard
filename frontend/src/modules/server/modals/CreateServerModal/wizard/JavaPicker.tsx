import { useJavaVersionOptions } from "@/modules/server/hooks";
import { JAVA_MANUAL_OPTION, useJavaPathChoice } from "@/modules/server/hooks/useJavaPathChoice";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DataReveal } from "@/shared/ui/data-reveal";
import { Input } from "@/shared/ui/input";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Spinner } from "@/shared/ui/spinner";
import { AccessArea } from "@shared/access/areas";
import { AlertTriangle, CheckCircle2, FolderSearch, Star, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { SAMPLE_JAVA_OPTIONS } from "../../../data/samples";

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
  const java = useJavaPathChoice({ path, onPathChange, onChange, custom: onPathChange ? options.filter((o) => o.custom) : [], isLoading });
  const { manual, typed, error } = java;

  const selected = manual ? JAVA_MANUAL_OPTION : (java.registered?.version ?? String(value ?? ""));

  const mismatch = !path && recommended != null && value != null && value !== recommended;

  return (
    <DataReveal id="create-server-java" data={options} loading={resolving || isLoading} sample={SAMPLE_JAVA_OPTIONS}>
      {(list) => {
        const managed = list.filter((o) => o.managed);
        const custom = onPathChange ? list.filter((o) => o.custom) : [];
        return (
          <div className="grid gap-1.5">
            <RadioGroup value={selected} onValueChange={(next) => java.select(String(next))} aria-label={t("label")} className="gap-1.5">
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
                <Row value={JAVA_MANUAL_OPTION}>
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
                    onChange={(event) => java.editPath(event.target.value)}
                    onKeyDown={(event) => {
                      // Apply the path instead of advancing the wizard
                      if (event.key !== "Enter") return;
                      event.preventDefault();
                      event.stopPropagation();
                      if (typed.trim()) void java.apply();
                    }}
                  />
                  <Button type="button" variant="outline" disabled={!typed.trim() || java.validating} onClick={() => void java.apply()}>
                    {java.validating ? <Spinner /> : t("manual.apply")}
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
      }}
    </DataReveal>
  );
}
