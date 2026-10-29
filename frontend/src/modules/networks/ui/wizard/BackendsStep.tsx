"use client";
import { WizardSection } from "@/modules/server/modals/CreateServerModal/wizard/WizardField";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Link2, Plus } from "lucide-react";
import {
  DEFAULT_MEMORY,
  MAX_NEW_BACKENDS,
  nameIssues,
  newServerKey,
  portIssues,
  suggestName,
  uniqueName,
  newNames,
  type NewServerDraft,
} from "../../lib/wizard-draft";
import { NewServerCard } from "./NewServerCard";
import type { StepProps } from "./ProxyStep";
import { ModeBadges, ServerChoice } from "./ServerChoice";

const DEFAULT_BLUEPRINT = "com.kubek.paper";

export function BackendsStep({ draft, update, candidates, panel }: StepProps) {
  const { t } = useTranslation("modules.networks.backends");
  const backends = (candidates?.backends ?? []).filter((b) => b.serverId !== draft.proxyServerId);
  const names = nameIssues(draft, panel);
  const ports = portIssues(draft, panel);
  const full = draft.newServers.length >= MAX_NEW_BACKENDS;

  const toggle = (serverId: string) =>
    update({
      backendIds: draft.backendIds.includes(serverId) ? draft.backendIds.filter((id) => id !== serverId) : [...draft.backendIds, serverId],
    });

  const setServers = (newServers: NewServerDraft[]) => update({ newServers });

  const add = () => {
    // Follows the last card so a series of servers needs fewer clicks
    const last = draft.newServers[draft.newServers.length - 1];
    const creatable = candidates?.creatable ?? [];
    const blueprintId =
      last?.blueprintId ?? (creatable.some((c) => c.blueprintId === DEFAULT_BLUEPRINT) ? DEFAULT_BLUEPRINT : (creatable[0]?.blueprintId ?? DEFAULT_BLUEPRINT));
    setServers([
      ...draft.newServers,
      {
        key: newServerKey(),
        name: suggestName(draft, panel.names),
        blueprintId,
        version: last?.version ?? "",
        port: "",
        memory: last?.memory ?? DEFAULT_MEMORY,
        aikar: last?.aikar ?? true,
        docker: last?.docker ?? false,
      },
    ]);
  };

  const duplicate = (server: NewServerDraft) => {
    const index = draft.newServers.indexOf(server);
    const copy = {
      ...server,
      key: newServerKey(),
      port: "",
      name: uniqueName(server.name.trim() || "server", [...panel.names, ...newNames(draft)]),
    };
    setServers([...draft.newServers.slice(0, index + 1), copy, ...draft.newServers.slice(index + 1)]);
  };

  return (
    <div>
      <WizardSection icon={Link2} tone="cyan" title={t("existing")}>
        {backends.length ? (
          <div role="group" aria-label={t("existing")} className="grid gap-2">
            {backends.map((backend) => (
              <ServerChoice
                key={backend.serverId}
                server={backend}
                multiple
                selected={draft.backendIds.includes(backend.serverId)}
                onToggle={() => toggle(backend.serverId)}
                badges={<ModeBadges modes={backend.modes} />}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg bg-subtle px-3 py-2.5 text-[13px] text-muted-foreground">{t("noCandidates")}</p>
        )}
      </WizardSection>

      <WizardSection icon={Plus} tone="green" title={t("create")}>
        <p className="mb-3 text-[13px] text-muted-foreground">{t("createHint")}</p>
        <div className="grid gap-3">
          {draft.newServers.map((server, index) => (
            <NewServerCard
              key={server.key}
              index={index}
              server={server}
              creatable={candidates?.creatable ?? []}
              nameIssue={names.get(server.key)}
              portIssue={ports.get(server.key)}
              portOwner={panel.ports.get(Number(server.port))}
              canDuplicate={!full}
              onChange={(patch) => setServers(draft.newServers.map((s) => (s.key === server.key ? { ...s, ...patch } : s)))}
              onDuplicate={() => duplicate(server)}
              onRemove={() => setServers(draft.newServers.filter((s) => s.key !== server.key))}
            />
          ))}
          <Button variant="outline" className="h-11 border-dashed" disabled={full} onClick={add}>
            <Plus />
            {full ? t("limit", MAX_NEW_BACKENDS) : t("add")}
          </Button>
        </div>
        {!draft.backendIds.length && !draft.newServers.length && <p className="mt-2 text-xs text-muted-foreground">{t("needOne")}</p>}
      </WizardSection>
    </div>
  );
}
