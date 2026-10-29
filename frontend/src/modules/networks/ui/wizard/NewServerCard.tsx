"use client";
import type { NetworkCandidates } from "@/api";
import { useBlueprints } from "@/modules/server-types/api/server-types.queries";
import { SwitchRow } from "@/modules/server/modals/CreateServerModal/wizard/AdvancedStep";
import { WizardField } from "@/modules/server/modals/CreateServerModal/wizard/WizardField";
import { useSystemInfoQuery } from "@/modules/system-monitoring/api/system-monitoring.queries";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Plate } from "@/shared/ui/plate";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Box, Container, Copy, Layers, Server, Trash2, Zap } from "lucide-react";
import { MIN_MEMORY, type NameIssue, type NewServerDraft, type PortIssue } from "../../lib/wizard-draft";
import { MemoryField, NameField, PortField } from "./ServerFields";
import { VersionSelect } from "./VersionSelect";

interface NewServerCardProps {
  index: number;
  server: NewServerDraft;
  creatable: NetworkCandidates["creatable"];
  nameIssue: NameIssue | undefined;
  portIssue: PortIssue | undefined;
  portOwner: string | undefined;
  canDuplicate: boolean;
  onChange: (patch: Partial<NewServerDraft>) => void;
  onDuplicate: () => void;
  onRemove: () => void;
}

/** One server the wizard creates, set up like in the regular creation wizard */
export function NewServerCard({
  index,
  server,
  creatable,
  nameIssue,
  portIssue,
  portOwner,
  canDuplicate,
  onChange,
  onDuplicate,
  onRemove,
}: NewServerCardProps) {
  const { t } = useTranslation("modules.networks.backends");
  const { t: tFields } = useTranslation("modules.networks.fields");
  const blueprints = useBlueprints().data ?? [];
  const dockerAvailable = !!useSystemInfoQuery().data?.dockerAvailable;
  const blueprint = blueprints.find((b) => b.id === server.blueprintId);
  const label = (id: string) => blueprints.find((b) => b.id === id)?.name ?? id;
  const id = (field: string) => `new-${server.key}-${field}`;
  const hasJvmArgs = !!blueprint?.variables.some((v) => v.key === "JVM_ARGS");

  return (
    <article className="rounded-lg border border-border bg-card">
      <header className="flex items-center gap-2.5 border-b border-border px-3 py-2">
        <Plate tone="green" size="sm">
          <Server />
        </Plate>
        <b className="min-w-0 flex-1 truncate text-[13.5px] font-semibold">{server.name.trim() || t("unnamed", index + 1)}</b>
        <Badge variant="secondary">{blueprint?.shortName ?? label(server.blueprintId)}</Badge>
        <Button size="icon-sm" variant="ghost" disabled={!canDuplicate} onClick={onDuplicate} aria-label={t("duplicate")} title={t("duplicate")}>
          <Copy />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={onRemove} aria-label={t("remove")} title={t("remove")}>
          <Trash2 />
        </Button>
      </header>

      <div className="grid gap-x-5 gap-y-4 p-3 sm:grid-cols-2">
        <NameField id={id("name")} label={t("name")} value={server.name} issue={nameIssue} onChange={(name) => onChange({ name })} />
        <WizardField label={t("type")} icon={Layers} htmlFor={id("type")}>
          <Select value={server.blueprintId} onValueChange={(next) => next && onChange({ blueprintId: next as string, version: "" })}>
            <SelectTrigger id={id("type")} className="w-full">
              <SelectValue>{(value: string) => label(value)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {creatable.map((c) => (
                <SelectItem key={c.blueprintId} value={c.blueprintId}>
                  {label(c.blueprintId)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </WizardField>
        <WizardField label={t("version")} icon={Box} htmlFor={id("version")}>
          <VersionSelect id={id("version")} blueprintId={server.blueprintId} value={server.version} onChange={(version) => onChange({ version })} />
        </WizardField>
        <PortField id={id("port")} value={server.port} auto={25566} issue={portIssue} owner={portOwner} onChange={(port) => onChange({ port })} />
        <MemoryField id={id("memory")} value={server.memory} min={MIN_MEMORY} onChange={(memory) => onChange({ memory })} />
      </div>

      {(hasJvmArgs || blueprint?.dockerCapable) && (
        <div className="border-t border-border px-3">
          {hasJvmArgs && (
            <SwitchRow
              icon={Zap}
              label={tFields("aikar.label")}
              description={tFields("aikar.description")}
              checked={server.aikar}
              onChange={(aikar) => onChange({ aikar })}
            />
          )}
          {blueprint?.dockerCapable && (
            <SwitchRow
              icon={Container}
              label={tFields("docker.label")}
              description={dockerAvailable ? tFields("docker.description") : tFields("docker.unavailable")}
              checked={dockerAvailable && server.docker}
              disabled={!dockerAvailable}
              onChange={(docker) => onChange({ docker })}
            />
          )}
        </div>
      )}
    </article>
  );
}
