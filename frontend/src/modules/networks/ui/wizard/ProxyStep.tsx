"use client";
import type { NetworkCandidates } from "@/api";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { SwitchRow } from "@/modules/server/modals/CreateServerModal/wizard/AdvancedStep";
import { WizardField, WizardSection } from "@/modules/server/modals/CreateServerModal/wizard/WizardField";
import { useSystemInfoQuery } from "@/modules/system-monitoring/api/system-monitoring.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Input } from "@/shared/ui/input";
import { Toggle } from "@/shared/ui/toggle";
import { ToggleGroup } from "@/shared/ui/toggle-group";
import { Box, Container, Network, Plus, Server, Waypoints } from "lucide-react";
import { MIN_PROXY_MEMORY, nameIssues, portIssues, PROXY_PORT, parsePort, type PanelState, type WizardDraft } from "../../lib/wizard-draft";
import { MemoryField, NameField, PortField } from "./ServerFields";
import { ServerChoice } from "./ServerChoice";
import { VersionSelect } from "./VersionSelect";

export const VELOCITY_ID = "com.kubek.velocity";

export interface StepProps {
  draft: WizardDraft;
  update: (patch: Partial<WizardDraft>) => void;
  candidates: NetworkCandidates | undefined;
  panel: PanelState;
}

export function ProxyStep({ draft, update, candidates, panel }: StepProps) {
  const { t } = useTranslation("modules.networks.proxy");
  const { t: tFields } = useTranslation("modules.networks.fields");
  const proxies = candidates?.proxies ?? [];
  const velocity = useBlueprint(VELOCITY_ID);
  const dockerAvailable = !!useSystemInfoQuery().data?.dockerAvailable;

  return (
    <div>
      <WizardSection icon={Network} tone="cyan" title={t("networkName")}>
        <Input
          id="network-name"
          aria-label={t("networkName")}
          value={draft.name}
          placeholder={t("networkNamePlaceholder")}
          maxLength={64}
          onChange={(event) => update({ name: event.target.value })}
        />
        <p className="mt-2 text-xs text-muted-foreground">{t("networkNameHint")}</p>
      </WizardSection>

      <WizardSection icon={Waypoints} tone="primary" title={t("source")}>
        <ToggleGroup
          variant="segmented"
          value={[draft.proxyMode]}
          onValueChange={(next) => next[0] && update({ proxyMode: next[0] as WizardDraft["proxyMode"] })}
          aria-label={t("source")}
          className="mb-4 w-full"
        >
          <Toggle variant="segmented" value="new" className="flex-1">
            <Plus />
            {t("new")}
          </Toggle>
          <Toggle variant="segmented" value="existing" className="flex-1">
            <Server />
            {t("existing")}
          </Toggle>
        </ToggleGroup>

        {draft.proxyMode === "new" ? (
          <>
            <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
              <NameField
                id="proxy-name"
                label={t("proxyName")}
                value={draft.proxyName}
                issue={nameIssues(draft, panel).get("proxy")}
                onChange={(proxyName) => update({ proxyName })}
              />
              <WizardField label={t("version")} icon={Box} htmlFor="proxy-version">
                <VersionSelect id="proxy-version" blueprintId={VELOCITY_ID} value={draft.proxyVersion} onChange={(proxyVersion) => update({ proxyVersion })} />
              </WizardField>
              <PortField
                id="proxy-port"
                value={draft.proxyPort}
                auto={PROXY_PORT}
                issue={portIssues(draft, panel).get("proxy")}
                owner={panel.ports.get(parsePort(draft.proxyPort) ?? 0)}
                onChange={(proxyPort) => update({ proxyPort })}
              />
              <MemoryField id="proxy-memory" value={draft.proxyMemory} min={MIN_PROXY_MEMORY} onChange={(proxyMemory) => update({ proxyMemory })} />
            </div>
            {velocity?.dockerCapable && (
              <div className="mt-3">
                <SwitchRow
                  icon={Container}
                  label={tFields("docker.label")}
                  description={dockerAvailable ? tFields("docker.description") : tFields("docker.unavailable")}
                  checked={dockerAvailable && draft.proxyDocker}
                  disabled={!dockerAvailable}
                  onChange={(proxyDocker) => update({ proxyDocker })}
                />
              </div>
            )}
          </>
        ) : proxies.length ? (
          <div role="radiogroup" aria-label={t("existing")} className="grid gap-2">
            {proxies.map((proxy) => (
              <ServerChoice
                key={proxy.serverId}
                server={proxy}
                selected={draft.proxyServerId === proxy.serverId}
                onToggle={() => update({ proxyServerId: proxy.serverId })}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-subtle px-3 py-2.5 text-[13px] text-muted-foreground">{t("noProxies")}</p>
        )}
      </WizardSection>
    </div>
  );
}
