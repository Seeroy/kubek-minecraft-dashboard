"use client";

import { api, type CreateServerDto } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { useMoveServersMutation } from "@/modules/server/api/server-folders.queries";
import { upsertServerInList } from "@/modules/server/api/servers.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { ApiError } from "@/shared/lib/http";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Kbd } from "@/shared/ui/kbd";
import { Plate } from "@/shared/ui/plate";
import { TaskStatus } from "@shared/types/task.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Plus, Terminal, TriangleAlert } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { useForm, useWatch, type FieldPath, type Resolver } from "react-hook-form";
import { startIfRequested } from "../../ui/ServerCreationBridge";
import { getLatestActiveCreation, useServerCreationStore } from "../../store/server-creation.store";
import type { ModalProps } from "@/shared/types/modal.types";
import { useBlueprintSelection } from "./useBlueprintSelection";
import { useJavaAutoResolution } from "./useJavaAutoResolution";
import { AdvancedStep } from "./wizard/AdvancedStep";
import { BasicsStep } from "./wizard/BasicsStep";
import { blueprintNeedsCoreFile, buildBlueprintForm, EMPTY_WIZARD_VALUES, primaryPort, type WizardValues } from "./wizard/buildBlueprintSchema";
import { CreationView } from "./wizard/CreationView";
import { buildJvmArgs, splitArgs } from "./wizard/jvm";
import { StepNav, WIZARD_STEPS } from "./wizard/StepNav";
import { TypeStep } from "./wizard/TypeStep";
import { useModal } from "@/shared/hooks/useModalsManager";

const CREATE_STEP = WIZARD_STEPS.length - 1;

// Every numeric value under a *PORT variable of an existing server
function usedPorts(servers: { name: string; variables?: Record<string, unknown> }[]) {
  const owners = new Map<number, string>();
  for (const server of servers)
    for (const [key, value] of Object.entries(server.variables ?? {})) if (/PORT$/i.test(key) && Number(value)) owners.set(Number(value), server.name);
  return owners;
}

export function CreateServerModal({ isOpen, onClose }: ModalProps) {
  const { openModal } = useModal();
  const { t } = useTranslation("modules.newServerModal");
  const { notify } = useNotifications();
  const { servers, selectServer } = useServerStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const moveServers = useMoveServersMutation();
  const setAutostart = useServerCreationStore((s) => s.setAutostart);

  // Reopening during a creation shows its progress
  const [taskId, setTaskId] = useState(() => getLatestActiveCreation()?.taskId ?? null);
  const [step, setStep] = useState(taskId ? CREATE_STEP : 0);
  const creation = useServerCreationStore((s) => (taskId ? s.creations[taskId] : undefined));
  const autostart = useServerCreationStore((s) => (taskId ? !!s.autostart[taskId] : false));

  // The validation schema changes per blueprint
  const schemaRef = useRef<ReturnType<typeof buildBlueprintForm>["schema"] | null>(null);
  const resolver: Resolver<WizardValues> = (values, ctx, options) =>
    schemaRef.current
      ? // The per blueprint schema cannot line up with the static WizardValues generic
        (zodResolver(schemaRef.current as never) as unknown as Resolver<WizardValues>)(values, ctx, options)
      : { values, errors: {} };
  const form = useForm<WizardValues>({ resolver, mode: "onTouched", defaultValues: EMPTY_WIZARD_VALUES });
  const [blueprintId, runtimeDocker, variables] = useWatch({ control: form.control, name: ["blueprintId", "runtimeDocker", "variables"] });

  const ports = usedPorts(servers);
  const nextFreePort = (from: number) => {
    let port = from;
    while (ports.has(port)) port++;
    return port;
  };

  const selection = useBlueprintSelection({ form, schemaRef, freePort: nextFreePort });
  const blueprint = selection.selectedBlueprint;
  const docker = !!blueprint?.dockerCapable && selection.dockerAvailable && runtimeDocker;
  const { javaResolving, resolvedJava } = useJavaAutoResolution({ form, selectedBlueprint: blueprint, versionVarKey: selection.versionVarKey });

  const defaultPort = blueprint ? (primaryPort(blueprint)?.default ?? 25565) : 25565;

  const pickBlueprint: typeof selection.selectBlueprint = (bp) => {
    if (bp.id === blueprintId) return;
    selection.selectBlueprint(bp);
  };

  const fieldsOf = (index: number): FieldPath<WizardValues>[] => {
    if (!blueprint) return [];
    if (index === 1)
      return [
        "name",
        "port",
        ...(blueprintNeedsCoreFile(blueprint) ? (["customFile"] as const) : []),
        ...blueprint.variables.filter((v) => !["XMS", "XMX", "JVM_ARGS"].includes(v.key)).map((v) => `variables.${v.key}` as const),
      ];
    if (index === 2) return ["variables.XMS", "variables.XMX", "eula"];
    return [];
  };

  const submit = form.handleSubmit(async (values) => {
    if (!blueprint) return;
    const merged: CreateServerDto["variables"] = { ...values.variables };
    const port = primaryPort(blueprint);
    if (port) merged[port.key] = values.port;
    if (blueprint.variables.some((v) => v.key === "JVM_ARGS")) {
      merged.JVM_ARGS = buildJvmArgs({
        maxMemoryMb: Number(values.variables.XMX) || 0,
        useAikarFlags: values.aikar,
        extraArguments: splitArgs(values.extraArgs),
      }).join(" ");
    }
    // Docker images ship their own Java, a host path means nothing inside the container
    if (values.javaPath && !docker) merged.JAVA_PATH = values.javaPath;

    const payload: CreateServerDto = { name: values.name, blueprintId: blueprint.id, variables: merged };
    // An explicit runtime only when the user could actually pick one
    if (blueprint.dockerCapable && selection.dockerAvailable) payload.runtime = values.runtimeDocker ? "docker" : "native";

    try {
      const response = await api.servers.create(payload, blueprintNeedsCoreFile(blueprint) ? values.customFile : undefined);
      upsertServerInList(queryClient, response.server);
      if (values.folderId) moveServers.mutate({ serverIds: [response.server.id], folderId: values.folderId });
      if (values.autostart) {
        setAutostart(response.taskId, true);
        // The task may already be done by the time the response lands
        startIfRequested(response.taskId);
      }
      setTaskId(response.taskId);
      setStep(CREATE_STEP);
    } catch (error) {
      notify({
        type: "error",
        title: t("modal.notifications.creationFailed"),
        message:
          error instanceof ApiError && error.message.includes("NAME_TAKEN")
            ? t("modal.notifications.nameTaken")
            : error instanceof Error
              ? error.message
              : t("modal.notifications.creationError"),
        duration: 8000,
        icon: TriangleAlert,
      });
    }
  });

  const next = async () => {
    // Enter can fire again while the create request is in flight
    if (form.formState.isSubmitting) return;
    if (!blueprint || !(await form.trigger(fieldsOf(step), { shouldFocus: true }))) return;
    if (step === CREATE_STEP - 1) await submit();
    else setStep(step + 1);
  };

  const restart = () => {
    setTaskId(null);
    setStep(0);
    schemaRef.current = null;
    form.reset(EMPTY_WIZARD_VALUES);
  };

  const openConsole = () => {
    if (creation?.serverId) selectServer(creation.serverId);
    onClose();
    router.push("/console");
  };

  const onKeyDown = (event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    if (event.key !== "Enter" || event.shiftKey || step >= CREATE_STEP || target.closest("button, textarea, [role=listbox], [role=combobox]")) return;
    event.preventDefault();
    void next();
  };

  const succeeded = creation?.status === TaskStatus.SUCCESS;
  const failed = creation?.status === TaskStatus.FAILED || creation?.status === TaskStatus.CANCELLED;
  const submitting = form.formState.isSubmitting;
  const stepKey = WIZARD_STEPS[step];
  const meta = blueprint
    ? [
        [blueprint.shortName ?? blueprint.name, selection.versionVarKey && variables?.[selection.versionVarKey]].filter(Boolean).join(" "),
        variables?.JAVA_VERSION && `Java ${variables.JAVA_VERSION}`,
        variables?.XMX && `${variables.XMX} ${t("advanced.memory.unit")}`,
        `${form.getValues("port")}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : undefined;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[min(720px,92vh)] max-h-none max-sm:h-dvh max-sm:max-w-full max-sm:rounded-none sm:max-w-[880px]">
        <DialogHeader className="flex-row items-center gap-3">
          <Plate tone="primary">
            <Plus />
          </Plate>
          <div className="min-w-0">
            <DialogTitle>{t("modal.title")}</DialogTitle>
            <DialogDescription>{t(`steps.${stepKey}.hint`)}</DialogDescription>
          </div>
        </DialogHeader>
        <StepNav current={step} />

        <DialogBody className="p-5" onKeyDown={onKeyDown}>
          <div key={stepKey} className="animate-enter">
            {step === CREATE_STEP && creation ? (
              <CreationView creation={creation} blueprint={blueprint} meta={meta} autostart={autostart} />
            ) : step === 0 || !blueprint ? (
              <TypeStep
                blueprints={selection.supportedBlueprints}
                loading={selection.blueprintsLoading}
                error={!!selection.blueprintsError}
                selectedId={blueprintId}
                onSelect={pickBlueprint}
                onConfirm={() => void next()}
                onImportModpack={() => {
                  onClose();
                  openModal("sidebar/import-server", { source: "modrinth" });
                }}
              />
            ) : step === 1 ? (
              <BasicsStep
                form={form}
                blueprint={blueprint}
                versionVarKey={selection.versionVarKey}
                versions={selection.versions}
                versionsLoading={selection.versionsLoading}
                javaResolving={javaResolving}
                recommendedJava={resolvedJava}
                docker={docker}
                portOwner={(port) => ports.get(port)}
                freePort={nextFreePort(defaultPort)}
              />
            ) : (
              <AdvancedStep form={form} blueprint={blueprint} dockerAvailable={selection.dockerAvailable} />
            )}
          </div>
        </DialogBody>

        <DialogFooter className="flex-row items-center">
          <span className={cn("mr-auto hidden text-[12.5px] text-muted-foreground sm:inline", step === CREATE_STEP && "inline")}>
            {step === 0 ? (
              blueprint ? (
                t("nav.picked", blueprint.shortName ?? blueprint.name)
              ) : (
                t("nav.pickType")
              )
            ) : step < CREATE_STEP ? (
              <>
                <Kbd>Enter</Kbd> {t("nav.keys")}
              </>
            ) : (
              !succeeded && !failed && t("nav.running")
            )}
          </span>

          {step === CREATE_STEP ? (
            <>
              {(succeeded || failed) && (
                <Button variant="outline" onClick={restart}>
                  {t("nav.another")}
                </Button>
              )}
              {!succeeded && (
                <Button variant="outline" onClick={onClose}>
                  {t("modal.close")}
                </Button>
              )}
              {succeeded && (
                <>
                  <Button variant="outline" onClick={onClose}>
                    {t("nav.done")}
                  </Button>
                  <Button onClick={openConsole}>
                    <Terminal />
                    {t("nav.openConsole")}
                  </Button>
                </>
              )}
            </>
          ) : (
            <>
              {step > 0 && (
                <Button variant="ghost" disabled={submitting} onClick={() => setStep(step - 1)}>
                  {t("nav.back")}
                </Button>
              )}
              <Button disabled={!blueprint || submitting} onClick={() => void next()}>
                {step === CREATE_STEP - 1 && <Check />}
                {submitting ? t("nav.creating") : step === CREATE_STEP - 1 ? t("nav.create") : t("nav.next")}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
