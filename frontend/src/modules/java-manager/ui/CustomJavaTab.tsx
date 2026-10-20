import type { JavaPathValidation, JavaVersion } from "@/api/java/java.model";
import {
  useAddCustomJavaMutation,
  useRemoveCustomJavaMutation,
  useValidateJavaPathMutation,
} from "@/modules/java-manager/api/java.queries";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  CheckCircle2,
  FolderSearch,
  Loader2,
  Plus,
  Trash2,
  XCircle,
} from "lucide-react";
import React, { useState } from "react";

interface CustomJavaTabProps {
  customVersions: JavaVersion[];
}

const CustomJavaTab: React.FC<CustomJavaTabProps> = ({ customVersions }) => {
  const { t } = useTranslation("modules.javaManager");
  const { notify } = useNotifications();

  const [path, setPath] = useState("");
  const [name, setName] = useState("");
  const [validation, setValidation] = useState<JavaPathValidation | null>(null);

  const validateMutation = useValidateJavaPathMutation();
  const addMutation = useAddCustomJavaMutation();
  const removeMutation = useRemoveCustomJavaMutation();

  const handleValidate = async () => {
    if (!path.trim()) return;
    setValidation(null);
    try {
      const result = await validateMutation.mutateAsync(path.trim());
      setValidation(result);
    } catch (error) {
      setValidation({
        valid: false,
        error: error instanceof Error ? error.message : undefined,
      });
    }
  };

  const handleAdd = async () => {
    try {
      await addMutation.mutateAsync({
        path: path.trim(),
        name: name.trim() || undefined,
      });
      notify({ title: t("custom.notifications.added"), type: "success" });
      setPath("");
      setName("");
      setValidation(null);
    } catch (error) {
      notify({
        title: t("custom.errors.addFailed"),
        message: error instanceof Error ? error.message : undefined,
        type: "error",
      });
    }
  };

  const handleRemove = async (version: JavaVersion) => {
    if (!version.id) return;
    try {
      await removeMutation.mutateAsync(version.id);
      notify({ title: t("custom.notifications.removed"), type: "success" });
    } catch (error) {
      notify({
        title: t("custom.errors.removeFailed"),
        message: error instanceof Error ? error.message : undefined,
        type: "error",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <FolderSearch className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle>{t("custom.add.title")}</CardTitle>
              <CardDescription>{t("custom.add.description")}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="custom-java-path">{t("custom.add.path")}</Label>
              <Input
                id="custom-java-path"
                value={path}
                placeholder={t("custom.add.pathPlaceholder")}
                onChange={(e) => {
                  setPath(e.target.value);
                  setValidation(null);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="custom-java-name">{t("custom.add.name")}</Label>
              <Input
                id="custom-java-name"
                value={name}
                placeholder={t("custom.add.namePlaceholder")}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {validation && (
            <div
              className={
                validation.valid
                  ? "flex items-start gap-2 rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-600 dark:text-green-400"
                  : "flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
              }
            >
              {validation.valid ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <span>
                {validation.valid
                  ? t(
                      "custom.add.validOk",
                      validation.version ?? "?",
                      validation.vendor ?? ""
                    )
                  : validation.error || t("custom.add.validFail")}
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleValidate}
              disabled={!path.trim() || validateMutation.isPending}
            >
              {validateMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FolderSearch className="mr-2 h-4 w-4" />
              )}
              {t("custom.add.validate")}
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!validation?.valid || addMutation.isPending}
            >
              {addMutation.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Plus className="mr-2 h-4 w-4" />
              )}
              {t("custom.add.submit")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("custom.list.title")}</CardTitle>
          <CardDescription>{t("custom.list.description")}</CardDescription>
        </CardHeader>
        <CardContent>
          {customVersions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-muted-foreground">
              <p className="font-medium">{t("custom.list.empty.title")}</p>
              <p className="text-sm">{t("custom.list.empty.description")}</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {customVersions.map((version) => (
                <Card key={version.id ?? version.path} className="p-5">
                  <CardContent className="p-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="truncate font-semibold">
                            {version.name}
                          </h4>
                          <Badge variant="secondary">
                            {t("custom.list.badge")}
                          </Badge>
                        </div>
                        {version.vendor && (
                          <p className="text-sm text-muted-foreground">
                            {t("installed.vendor", version.vendor)}
                          </p>
                        )}
                        <p
                          className="truncate text-xs text-muted-foreground"
                          title={version.path}
                        >
                          {version.path}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemove(version)}
                        disabled={removeMutation.isPending}
                        className="text-destructive hover:text-destructive"
                      >
                        {removeMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CustomJavaTab;
