"use client";
import type { JavaPathValidation } from "@/api/java/java.model";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Field, FieldLabel } from "@/shared/ui/field";
import { Input } from "@/shared/ui/input";
import { SettingsGroup } from "@/shared/ui/settings";
import { Spinner } from "@/shared/ui/spinner";
import { Check, FolderSearch, Plus, Search, X } from "lucide-react";
import { useState } from "react";
import { useAddCustomJavaMutation, useValidateJavaPathMutation } from "../api/java.queries";

/** Register a Java from a local path, it has to pass validation before it can be added */
export function CustomJavaForm() {
  const { t } = useTranslation("modules.javaManager.custom.add");
  const { t: tRoot } = useTranslation("modules.javaManager.toasts");
  const { notify } = useNotifications();
  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [result, setResult] = useState<JavaPathValidation | null>(null);
  const validate = useValidateJavaPathMutation();
  const add = useAddCustomJavaMutation();

  const check = () =>
    validate.mutate(path.trim(), {
      onSuccess: setResult,
      onError: (error) => setResult({ valid: false, error: error instanceof Error ? error.message : undefined }),
    });

  const submit = () =>
    add.mutate(
      { path: path.trim(), name: name.trim() || undefined },
      {
        onSuccess: () => {
          notify({ type: "success", title: tRoot("customAdded") });
          setPath("");
          setName("");
          setResult(null);
        },
      }
    );

  return (
    <SettingsGroup tone="cyan" icon={FolderSearch} title={t("title")} description={t("description")} className="mb-0" flush>
      <div className="grid items-end gap-2 p-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto_auto]">
        <Field>
          <FieldLabel htmlFor="custom-java-path">{t("path")}</FieldLabel>
          <Input
            id="custom-java-path"
            className="font-mono"
            value={path}
            placeholder={t("pathPlaceholder")}
            onChange={(e) => {
              setPath(e.target.value);
              setResult(null);
            }}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="custom-java-name">{t("name")}</FieldLabel>
          <Input id="custom-java-name" value={name} placeholder={t("namePlaceholder")} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Button variant="outline" disabled={!path.trim() || validate.isPending} onClick={check}>
          {validate.isPending ? <Spinner /> : <Search />}
          {t("validate")}
        </Button>
        <Button disabled={!result?.valid || add.isPending} onClick={submit}>
          {add.isPending ? <Spinner /> : <Plus />}
          {t("submit")}
        </Button>
      </div>
      {result && (
        <p className={cn("flex items-center gap-2 px-4 pb-4 text-[12.5px]", result.valid ? "text-success" : "text-danger")}>
          {result.valid ? <Check className="size-3.5" /> : <X className="size-3.5" />}
          <span className="text-foreground">{result.valid ? t("found", result.version ?? "?", result.vendor ?? "") : result.error || t("notFound")}</span>
        </p>
      )}
    </SettingsGroup>
  );
}
