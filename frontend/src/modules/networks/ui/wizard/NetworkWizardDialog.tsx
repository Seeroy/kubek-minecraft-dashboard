"use client";
import type { NetworkChangeResult } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { StepNav } from "@/modules/server/modals/CreateServerModal/wizard/StepNav";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { qk } from "@/shared/queries/query-keys";
import type { ModalProps } from "@/shared/types/modal.types";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Plate } from "@/shared/ui/plate";
import { TaskStatus } from "@shared/types/task.types";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Network, TriangleAlert } from "lucide-react";
import React, { useState } from "react";
import { useCreateNetworkMutation, useNetworkCandidates, useNetworkPlan } from "../../api/networks.queries";
import { isTaskFinished, useWatchedTask } from "@/shared/hooks/useWatchedTask";
import { networkErrorMessage } from "../../lib/errors";
import { buildAikarFlags } from "@/modules/server/modals/CreateServerModal/wizard/jvm";
import { initialDraft, stepValid, toWizardProps, uniqueName, WIZARD_STEPS, type WizardDraft } from "../../lib/wizard-draft";
import { ApplyStep } from "./ApplyStep";
import { BackendsStep } from "./BackendsStep";
import { OptionsStep } from "./OptionsStep";
import { ProxyStep } from "./ProxyStep";
import { ReviewStep } from "./ReviewStep";
import { usePanelState } from "./usePanelState";
import { VelocityStep } from "./VelocityStep";
import { useResolvedVersion, useResolvedVersions } from "./VersionSelect";

const aikarArgs = (memory: number) => buildAikarFlags(memory).join(" ");

export type NetworkWizardProps = { proxyServerId?: string };

declare module "@/shared/types/modal-registry" {
  interface ModalRegistry {
    "networks/wizard": {
      props: NetworkWizardProps;
      result: string | null;
    };
  }
}

const NetworkWizardDialog: React.FC<ModalProps<string | null> & NetworkWizardProps> = ({ isOpen, onClose, proxyServerId }) => {
  const { t } = useTranslation("modules.networks");
  const { notify } = useNotifications();
  const qc = useQueryClient();
  const candidates = useNetworkCandidates(isOpen).data;
  const create = useCreateNetworkMutation();

  const panel = usePanelState();
  // The default proxy name must not collide with an existing server
  const [raw, setDraft] = useState<WizardDraft>(() => {
    const draft = initialDraft(proxyServerId);
    return { ...draft, proxyName: uniqueName(draft.proxyName, panel.names) };
  });
  const [step, setStep] = useState(0);
  const [taskId, setTaskId] = useState<string | null>(null);
  const task = useWatchedTask(taskId).data;

  // Versions fall back to the newest one the blueprint offers
  const proxyVersion = useResolvedVersion("com.kubek.velocity", raw.proxyVersion);
  const versions = useResolvedVersions(raw.newServers);
  // Cheap to rebuild, the plan query compares props by value
  const draft: WizardDraft = { ...raw, proxyVersion, newServers: raw.newServers.map((server, i) => ({ ...server, version: versions[i] })) };
  const props = toWizardProps(draft, aikarArgs);

  const key = WIZARD_STEPS[step];
  // Same query as the review step, it decides whether applying makes sense
  const plan = useNetworkPlan(key === "review" ? props : null);
  const update = (patch: Partial<WizardDraft>) => setDraft((prev) => ({ ...prev, ...patch }));
  const finished = isTaskFinished(task);
  const stepProps = { draft, update, candidates, panel };
  const result = task?.status === TaskStatus.SUCCESS ? (task.result as NetworkChangeResult) : undefined;

  const close = () => {
    if (taskId) {
      // Members land in a folder named after the network
      for (const queryKey of [qk.networks.all, qk.servers.all, qk.serverFolders.all]) void qc.invalidateQueries({ queryKey });
    }
    onClose(result?.networkId ?? null);
  };

  const apply = async () => {
    try {
      const ref = await create.mutateAsync(props);
      setTaskId(ref.taskId);
      setStep(WIZARD_STEPS.indexOf("apply"));
    } catch (error) {
      notify({ type: "error", title: t("actions.create"), message: networkErrorMessage(error, t), icon: TriangleAlert, duration: 8000 });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && close()}>
      <DialogContent className="h-[min(720px,92vh)] max-h-none max-sm:h-dvh max-sm:max-w-full max-sm:rounded-none sm:max-w-[680px]">
        <DialogHeader className="flex-row items-center gap-3">
          <Plate tone="cyan">
            <Network />
          </Plate>
          <div className="min-w-0">
            <DialogTitle className="flex items-center gap-2">
              {t("wizard.title")}
              <Badge variant="warning">{t("wizard.beta")}</Badge>
            </DialogTitle>
            <DialogDescription>{t(`wizard.hints.${key}`)}</DialogDescription>
          </div>
        </DialogHeader>
        <StepNav current={step} steps={WIZARD_STEPS} label={(id) => t(`wizard.steps.${id}`)} />

        <DialogBody className="p-5">
          <div key={key} className="animate-enter">
            {key === "proxy" && <ProxyStep {...stepProps} />}
            {key === "backends" && <BackendsStep {...stepProps} />}
            {key === "velocity" && <VelocityStep {...stepProps} />}
            {key === "options" && <OptionsStep {...stepProps} />}
            {key === "review" && <ReviewStep props={props} />}
            {key === "apply" && taskId && <ApplyStep taskId={taskId} />}
          </div>
        </DialogBody>

        <DialogFooter className="flex-row items-center justify-end">
          {key === "apply" ? (
            <Button variant={finished ? "default" : "outline"} onClick={close}>
              {result ? <Check /> : null}
              {result ? t("actions.done") : t("actions.close")}
            </Button>
          ) : (
            <>
              {step === 0 ? (
                <Button variant="ghost" onClick={close}>
                  {t("actions.cancel")}
                </Button>
              ) : (
                <Button variant="ghost" disabled={create.isPending} onClick={() => setStep(step - 1)}>
                  <ArrowLeft />
                  {t("actions.back")}
                </Button>
              )}
              {key === "review" ? (
                <Button disabled={create.isPending || !plan.isSuccess} onClick={() => void apply()}>
                  <Check />
                  {create.isPending ? t("actions.creating") : t("actions.create")}
                </Button>
              ) : (
                <Button disabled={!stepValid(key, draft, panel)} onClick={() => setStep(step + 1)}>
                  {t("actions.next")}
                  <ArrowRight />
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NetworkWizardDialog;
