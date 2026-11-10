"use client";
import type { NetworkPlan, NetworkPlanNote, NetworkWizardProps } from "@/api";
import { WizardSection } from "@/modules/server/modals/CreateServerModal/wizard/WizardField";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { DataReveal } from "@/shared/ui/data-reveal";
import { FileText, Info, RotateCw, Server, TriangleAlert } from "lucide-react";
import { useNetworkPlan } from "../../api/networks.queries";
import { SAMPLE_PLAN } from "../../data/samples";
import { networkErrorMessage } from "../../lib/errors";
import { FileDiff } from "./FileDiff";

function noteText(note: NetworkPlanNote, t: (key: string, ...args: unknown[]) => string): string {
  switch (note.code) {
    case "new_server":
      return t("notes.new_server", note.serverName, note.port);
    case "install_fabric_proxy":
      return t("notes.install_fabric_proxy", note.serverName);
    case "legacy_forced":
      return t("notes.legacy_forced", note.serverNames.join(", "));
    case "legacy_insecure":
      return t("notes.legacy_insecure");
  }
}

const WARNINGS = new Set<NetworkPlanNote["code"]>(["legacy_forced", "legacy_insecure"]);

export function ReviewStep({ props }: { props: NetworkWizardProps }) {
  const { t } = useTranslation("modules.networks.review");
  const { t: tNetworks } = useTranslation("modules.networks");
  const plan = useNetworkPlan(props);

  if (!plan.isLoading && (plan.isError || !plan.data)) {
    return (
      <Alert variant="destructive">
        <TriangleAlert />
        <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {t("failed")}: {networkErrorMessage(plan.error, tNetworks)}
          </span>
          <Button size="sm" variant="outline" onClick={() => void plan.refetch()}>
            <RotateCw />
            {t("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <DataReveal id="network-review" data={plan.data} loading={plan.isLoading} label={t("loading")} sample={SAMPLE_PLAN}>
      {(data) => <PlanView plan={data} />}
    </DataReveal>
  );
}

function PlanView({ plan }: { plan: NetworkPlan }) {
  const { t } = useTranslation("modules.networks.review");
  const { t: tNetworks } = useTranslation("modules.networks");
  const { notes, changes, restart } = plan;
  const created = notes.filter((note) => note.code === "new_server");
  const other = notes.filter((note) => note.code !== "new_server");

  return (
    <div>
      {created.length > 0 && (
        <WizardSection icon={Server} tone="green" title={tNetworks("wizard.steps.backends")}>
          <ul className="grid gap-1 text-[13px]">
            {created.map((note) => (
              <li key={noteText(note, t)} className="text-muted-foreground">
                {noteText(note, t)}
              </li>
            ))}
          </ul>
        </WizardSection>
      )}

      <WizardSection icon={FileText} tone="blue" title={t("files")}>
        <div className="grid gap-2">
          {other.map((note) => (
            <Alert key={note.code}>
              {WARNINGS.has(note.code) ? <TriangleAlert className="text-warn" /> : <Info />}
              <AlertDescription>{noteText(note, t)}</AlertDescription>
            </Alert>
          ))}
          <Alert>
            <Info />
            <AlertDescription>{t("binding")}</AlertDescription>
          </Alert>
          {changes.map((change, index) => (
            <FileDiff key={`${change.serverName}/${change.path}`} change={change} defaultOpen={index === 0} />
          ))}
          {restart.length > 0 && <p className="text-xs text-muted-foreground">{t("restart", restart.length)}</p>}
        </div>
      </WizardSection>
    </div>
  );
}
