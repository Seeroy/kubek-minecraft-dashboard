"use client";

import { useServerStore } from "@/modules/server";
import { nextFreePort, portOwners } from "@/modules/server/lib/ports";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Plate } from "@/shared/ui/plate";
import { TaskStatus } from "@shared/types/task.types";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";
import { useForm, useWatch, type FieldPath, type Resolver } from "react-hook-form";
import { getLatestActiveCreation, useServerCreationStore } from "../../store/server-creation.store";
import type { ModalProps } from "@/shared/types/modal.types";
import { useBlueprintSelection } from "./useBlueprintSelection";
import { useCreateServerSubmit } from "./useCreateServerSubmit";
import { useJavaAutoResolution } from "./useJavaAutoResolution";
import { AdvancedStep } from "./wizard/AdvancedStep";
import { BasicsStep } from "./wizard/BasicsStep";
import { blueprintNeedsCoreFile, buildBlueprintForm, EMPTY_WIZARD_VALUES, primaryPort, type WizardValues } from "./wizard/buildBlueprintSchema";
import { CreationView } from "./wizard/CreationView";
import { creationSummary } from "./wizard/creationSummary";
import { CREATE_STEP, StepNav, WIZARD_STEPS } from "./wizard/StepNav";
import { TypeStep } from "./wizard/TypeStep";
import { WizardFooter } from "./wizard/WizardFooter";
import { useModal } from "@/shared/hooks/useModalsManager";

export function CreateServerModal({ isOpen, onClose }: ModalProps) {
  const { openModal } = useModal();
  const { t } = useTranslation("modules.newServerModal");
  const { servers, selectServer } = useServerStore();
  const router = useRouter();

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

  const ports = portOwners(servers);
  const freePort = (from: number) => nextFreePort(ports, from);

  const selection = useBlueprintSelection({ form, schemaRef, freePort });
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

  const submit = useCreateServerSubmit({
    form,
    blueprint,
    docker,
    dockerAvailable: selection.dockerAvailable,
    onCreated: (createdTaskId) => {
      setTaskId(createdTaskId);
      setStep(CREATE_STEP);
    },
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
    ? creationSummary(blueprint, { variables, versionVarKey: selection.versionVarKey, port: form.getValues("port"), memoryUnit: t("advanced.memory.unit") })
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
                versionLabels={selection.versionLabels}
                versionsLoading={selection.versionsLoading}
                versionsError={selection.versionsError}
                javaResolving={javaResolving}
                recommendedJava={resolvedJava}
                docker={docker}
                portOwner={(port) => ports.get(port)}
                freePort={freePort(defaultPort)}
              />
            ) : (
              <AdvancedStep form={form} blueprint={blueprint} dockerAvailable={selection.dockerAvailable} />
            )}
          </div>
        </DialogBody>

        <WizardFooter
          step={step}
          blueprint={blueprint}
          submitting={submitting}
          succeeded={succeeded}
          failed={failed}
          onBack={() => setStep(step - 1)}
          onNext={() => void next()}
          onRestart={restart}
          onClose={onClose}
          onOpenConsole={openConsole}
        />
      </DialogContent>
    </Dialog>
  );
}
