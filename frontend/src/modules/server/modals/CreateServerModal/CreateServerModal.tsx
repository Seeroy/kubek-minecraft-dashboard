"use client";

import type { CreateServerDto } from "@/api";
import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { useLanguageContext } from "@/shared/context/language-context";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { zodResolver } from "@hookform/resolvers/zod";
import { Server, SlidersHorizontal, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { getLatestActiveCreation } from "../../store/server-creation.store";
import { CreationProgressStageList } from "./CreationProgressStageList";
import { CreateServerModalProps } from "./types";
import { useBlueprintSelection } from "./useBlueprintSelection";
import { useJavaAutoResolution } from "./useJavaAutoResolution";
import { useServerCreationProgress } from "./useServerCreationProgress";
import { AdvancedSection } from "./wizard/AdvancedSection";
import { BlueprintVariableField } from "./wizard/BlueprintVariableField";
import {
  blueprintNeedsCoreFile,
  buildBlueprintForm,
  EMPTY_WIZARD_VALUES,
  primaryPort,
  type WizardValues,
} from "./wizard/buildBlueprintSchema";
import { CoreFileUploadZone } from "./wizard/CoreFileUploadZone";
import { JavaVersionField } from "./wizard/JavaVersionField";
import { ServerBasicsSection } from "./wizard/ServerBasicsSection";

// Map well-known variable keys to existing translation keys
const VARIABLE_LABEL_KEYS: Record<string, string> = {
  GAME_VERSION: "modules.newServerModal.core.version.label",
  JAVA_VERSION: "modules.newServerModal.java.version.label",
};

// JVM-level variables rendered by the dedicated Advanced section
const ADVANCED_VARIABLE_KEYS = new Set(["XMS", "XMX", "JVM_ARGS"]);

export function CreateServerModal({ isOpen, onClose }: CreateServerModalProps) {
  const { notify } = useNotifications();
  const { servers, setServers, selectServer } = useServerStore();
  const { t } = useLanguageContext();
  const router = useRouter();

  const [view, setView] = useState<"form" | "progress">("form");
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // The validation schema changes per blueprint
  const schemaRef = useRef<
    ReturnType<typeof buildBlueprintForm>["schema"] | null
  >(null);
  const resolver: Resolver<WizardValues> = useCallback(
    (values, ctx, options) => {
      if (!schemaRef.current) return { values, errors: {} };
      // The schema is built dynamically per blueprint, so its inferred type cannot
      // line up with the static WizardValues generic. Bridge RHF and zod here
      return (
        zodResolver(
          schemaRef.current as never
        ) as unknown as Resolver<WizardValues>
      )(values, ctx, options);
    },
    []
  );

  const form = useForm<WizardValues>({
    resolver,
    mode: "onChange",
    defaultValues: EMPTY_WIZARD_VALUES,
  });

  const blueprintId = form.watch("blueprintId");
  const variables = form.watch("variables");
  const { errors } = form.formState;

  const {
    blueprintsLoading,
    blueprintsError,
    supportedBlueprints,
    selectedBlueprint,
    selectBlueprint,
    versionVarKey,
    versions,
    versionsLoading,
  } = useBlueprintSelection({ isOpen, form, schemaRef });

  const { javaResolving, resolvedJava } = useJavaAutoResolution({
    form,
    selectedBlueprint,
    versionVarKey,
  });

  const {
    creation,
    creationStages,
    isCreationSuccess,
    isCreationFailed,
    creationMessage,
    clearCreation,
  } = useServerCreationProgress(activeTaskId);

  // On open: resume a running creation, otherwise start a fresh form
  useEffect(() => {
    if (!isOpen) return;
    const active = getLatestActiveCreation();
    if (active) {
      setActiveTaskId(active.taskId);
      setView("progress");
      return;
    }
    setActiveTaskId(null);
    setView("form");
    schemaRef.current = null;
    form.reset(EMPTY_WIZARD_VALUES);
  }, [form, isOpen]);

  const handleSubmit = useCallback(
    async (values: WizardValues) => {
      const bp = selectedBlueprint;
      if (!bp) return;

      const port = primaryPort(bp);
      const mergedVariables: Record<string, string | number | boolean> = {
        ...values.variables,
      };
      if (port) mergedVariables[port.key] = values.port;

      const payload: CreateServerDto = {
        name: values.name,
        blueprintId: bp.id,
        variables: mergedVariables,
      };

      const coreFile = blueprintNeedsCoreFile(bp)
        ? values.customFile
        : undefined;

      try {
        const response = await api.servers.create(payload, coreFile);
        setServers([
          response.server,
          ...servers.filter((s) => s.id !== response.server.id),
        ]);
        setActiveTaskId(response.taskId);
        setView("progress");
      } catch (error: unknown) {
        notify({
          title: t("modules.newServerModal.modal.notifications.creationFailed"),
          message:
            error instanceof Error
              ? error.message
              : t("modules.newServerModal.modal.notifications.creationError"),
          type: "error",
          duration: 8000,
          icon: TriangleAlert,
        });
      }
    },
    [selectedBlueprint, servers, setServers, notify, t]
  );

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  const handleOpenServer = () => {
    const serverId = creation?.serverId;
    if (serverId) {
      selectServer(serverId);
      if (typeof window !== "undefined")
        window.localStorage.setItem("selected_server_id", serverId);
      router.push("/");
    }
    if (activeTaskId) clearCreation(activeTaskId);
    onClose();
  };

  // Reset back to a blank form
  const resetToForm = useCallback(
    (keepCreation: boolean) => {
      if (!keepCreation && activeTaskId) clearCreation(activeTaskId);
      setActiveTaskId(null);
      setView("form");
      schemaRef.current = null;
      form.reset(EMPTY_WIZARD_VALUES);
    },
    [activeTaskId, clearCreation, form]
  );

  const handleCreateAnother = () => resetToForm(false);

  // Start another server while the current one is still being created in the background
  const handleStartAnother = () => resetToForm(true);

  const editableVariables = (selectedBlueprint?.variables ?? []).filter(
    (v) => v.userEditable !== false && !ADVANCED_VARIABLE_KEYS.has(v.key)
  );
  // The Advanced section only applies to JVM blueprints that expose a max-heap variable
  const hasMemoryVariable =
    selectedBlueprint?.variables.some((v) => v.key === "XMX") ?? false;
  const port = selectedBlueprint ? primaryPort(selectedBlueprint) : undefined;
  const showProgress = view === "progress" && !!creation;

  // Prefer a localized label for known variables, fall back to the blueprint-provided one
  const labelFor = (key: string, fallback?: string) => {
    const i18nKey = VARIABLE_LABEL_KEYS[key];
    if (i18nKey) {
      const translated = t(i18nKey);
      if (!translated.startsWith("NOT TRANSLATED")) return translated;
    }
    return fallback ?? key;
  };

  // Translate the primary port label by its blueprint label (Game/Proxy), falling back to the
  // blueprint-provided label and finally the generic port label
  const portLabel = (() => {
    const key = port?.label?.toLowerCase();
    if (key) {
      const translated = t(`modules.newServerModal.blueprint.ports.${key}`);
      if (!translated.startsWith("NOT TRANSLATED")) return translated;
    }
    return port?.label ?? t("modules.newServerModal.general.port.label");
  })();

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[92vh] min-h-[70vh] w-[96vw] max-w-6xl flex-col sm:max-w-6xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Server className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle>
              {showProgress
                ? `${t("modules.newServerModal.modal.progress.title")}${creation?.serverName ? `: ${creation.serverName}` : ""}`
                : t("modules.newServerModal.modal.title")}
            </DialogTitle>
          </div>
        </DialogHeader>

        {showProgress ? (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex-1 overflow-y-auto pr-1">
              <CreationProgressStageList
                stages={creationStages}
                message={
                  !isCreationSuccess && !isCreationFailed
                    ? creationMessage
                    : null
                }
              />
              {isCreationFailed && creation?.error && (
                <p className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {creation.error}
                </p>
              )}
            </div>

            <DialogFooter className="mt-4 gap-2">
              {isCreationSuccess ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreateAnother}
                  >
                    {t("modules.newServerModal.modal.progress.buttons.another")}
                  </Button>
                  <Button type="button" onClick={handleOpenServer}>
                    {t("modules.newServerModal.modal.progress.buttons.open")}
                  </Button>
                </>
              ) : isCreationFailed ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCreateAnother}
                  >
                    {t("modules.newServerModal.modal.progress.buttons.back")}
                  </Button>
                  <Button type="button" variant="outline" onClick={onClose}>
                    {t("modules.newServerModal.modal.progress.buttons.close")}
                  </Button>
                </>
              ) : (
                <>
                  <span className="flex-1 self-center text-xs text-muted-foreground">
                    {t("modules.newServerModal.modal.progress.runningHint")}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleStartAnother}
                  >
                    {t("modules.newServerModal.modal.progress.buttons.another")}
                  </Button>
                  <Button type="button" variant="outline" onClick={onClose}>
                    {t("modules.newServerModal.modal.progress.buttons.close")}
                  </Button>
                </>
              )}
            </DialogFooter>
          </div>
        ) : (
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="flex-1 space-y-6 overflow-y-auto pr-1">
              {blueprintsError && (
                <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {t("modules.newServerModal.modal.notifications.catalogError")}
                </div>
              )}

              {/* Zone: basics - name and core selection */}
              <ServerBasicsSection
                form={form}
                blueprints={supportedBlueprints}
                selectedId={blueprintId}
                onSelectBlueprint={selectBlueprint}
                blueprintsLoading={blueprintsLoading}
              />

              {selectedBlueprint && (
                <div
                  className={cn(
                    "grid grid-cols-1 gap-6 lg:items-start",
                    hasMemoryVariable && "lg:grid-cols-2"
                  )}
                >
                  {/* Zone: parameters - variables, port, optional core file */}
                  <section className="space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="size-4 text-primary" />
                      <h3 className="text-sm font-semibold">
                        {t("modules.newServerModal.general.parameters")}
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {editableVariables.map((variable) => {
                        if (variable.key === "JAVA_VERSION") {
                          return (
                            <JavaVersionField
                              key={variable.key}
                              label={labelFor(variable.key, variable.label)}
                              value={
                                variables?.JAVA_VERSION as number | undefined
                              }
                              isResolving={javaResolving}
                              recommendedVersion={resolvedJava}
                              onChange={(value) =>
                                form.setValue("variables.JAVA_VERSION", value, {
                                  shouldValidate: true,
                                })
                              }
                            />
                          );
                        }
                        return (
                          <BlueprintVariableField
                            key={variable.key}
                            variable={variable}
                            label={labelFor(variable.key, variable.label)}
                            value={variables?.[variable.key]}
                            onChange={(value) =>
                              form.setValue(
                                `variables.${variable.key}`,
                                value,
                                { shouldValidate: true }
                              )
                            }
                            versions={
                              variable.key === versionVarKey
                                ? (versions ?? [])
                                : undefined
                            }
                            versionsLoading={
                              variable.key === versionVarKey
                                ? versionsLoading
                                : undefined
                            }
                            error={errors.variables?.[variable.key]?.message}
                          />
                        );
                      })}

                      <div className="space-y-2">
                        <Label htmlFor="port">{portLabel}</Label>
                        <Input
                          id="port"
                          type="number"
                          {...form.register("port", { valueAsNumber: true })}
                        />
                        {errors.port && (
                          <p className="text-sm text-destructive">
                            {t(
                              "modules.newServerModal.general.port.errors.range"
                            )}
                          </p>
                        )}
                      </div>
                    </div>

                    {blueprintNeedsCoreFile(selectedBlueprint) && (
                      <CoreFileUploadZone form={form} />
                    )}
                  </section>

                  {/* Zone: advanced - memory, Aikar flags, extra arguments */}
                  {hasMemoryVariable && (
                    <AdvancedSection
                      key={selectedBlueprint.id}
                      form={form}
                      minMemoryKey="XMS"
                      maxMemoryKey="XMX"
                      argsKey="JVM_ARGS"
                    />
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                {t("modules.newServerModal.modal.buttons.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={
                  !form.formState.isValid || form.formState.isSubmitting
                }
              >
                {form.formState.isSubmitting ? (
                  t("modules.newServerModal.modal.buttons.creating")
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    {t("modules.newServerModal.modal.buttons.create")}
                  </span>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
