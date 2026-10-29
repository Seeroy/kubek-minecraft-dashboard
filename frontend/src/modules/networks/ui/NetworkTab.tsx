"use client";
import type { Network, NetworkChangeResult } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useAuthStore } from "@/shared/stores/auth-store";
import { confirmDialog } from "@/shared/modals";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty";
import { KeyValue, KeyValueItem } from "@/shared/ui/key-value";
import { Panel, PanelActions, PanelHead, PanelMeta, PanelTitle } from "@/shared/ui/panel";
import { Skeleton } from "@/shared/ui/skeleton";
import { AccessArea } from "@shared/access/areas";
import { KeyRound, Network as NetworkIcon, Plus, RotateCw, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useNetworkChangeMutation, useNetworkOf, type NetworkChange } from "../api/networks.queries";
import { networkErrorMessage } from "../lib/errors";
import { NETWORK_WIZARD_MODAL_ID } from "../modal-ids";
import { AddMemberForm } from "./AddMemberForm";
import { MemberRow } from "./MemberRow";
import { RestartPrompt } from "./RestartPrompt";

/** Velocity network of a proxy, opened from the server settings */
export function NetworkTab({ serverId }: { serverId: string }) {
  const { t } = useTranslation("modules.networks.tab");
  const { open } = useModal();
  const query = useNetworkOf(serverId);
  // The wizard can create proxy backends, so it needs servers write too
  const canCreate = useAuthStore((s) => s.can(AccessArea.NETWORKS, "write") && s.can(AccessArea.SERVERS, "write"));

  if (query.isLoading) return <Skeleton className="h-64 rounded-lg" />;

  if (query.isError) {
    return (
      <Empty className="rounded-lg border border-border bg-card py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <TriangleAlert />
          </EmptyMedia>
          <EmptyTitle>{t("loadFailed")}</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  const network = query.data;
  if (!network || network.proxy.serverId !== serverId) {
    return (
      <Empty className="rounded-lg border border-border bg-card py-14">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <NetworkIcon />
          </EmptyMedia>
          <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
          <EmptyDescription>{t("emptyText")}</EmptyDescription>
        </EmptyHeader>
        {canCreate && (
          <EmptyContent>
            <Button onClick={() => void open(NETWORK_WIZARD_MODAL_ID, { proxyServerId: serverId })}>
              <Plus />
              {t("createNetwork")}
            </Button>
          </EmptyContent>
        )}
      </Empty>
    );
  }

  return <NetworkPanel network={network} />;
}

function NetworkPanel({ network }: { network: Network }) {
  const { t } = useTranslation("modules.networks.tab");
  const { t: tNetworks } = useTranslation("modules.networks");
  const { notify } = useNotifications();
  const change = useNetworkChangeMutation(network.id);
  const [restart, setRestart] = useState<string[]>([]);
  const canWrite = useAuthStore((s) => s.can(AccessArea.NETWORKS, "write"));
  const canManage = useAuthStore((s) => s.can(AccessArea.NETWORKS, "manage"));

  const run = (next: NetworkChange) =>
    change.mutate(next, {
      onSuccess: (result: NetworkChangeResult) => setRestart((prev) => [...new Set([...prev, ...result.restart])]),
      onError: (error) => notify({ type: "error", title: t("title"), message: networkErrorMessage(error, tNetworks), icon: TriangleAlert }),
    });

  const order = network.members.filter((m) => m.tryOrder !== null).map((m) => m.serverId);
  const move = (serverId: string, by: number) => {
    const ids = [...order];
    const index = ids.indexOf(serverId);
    [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
    run({ kind: "order", order: ids });
  };
  const toggleTry = (serverId: string) =>
    run({ kind: "order", order: order.includes(serverId) ? order.filter((id) => id !== serverId) : [...order, serverId] });

  const confirmRun = async (next: NetworkChange, options: Parameters<typeof confirmDialog>[0]) => {
    if (await confirmDialog(options)) run(next);
  };

  return (
    <div className="grid gap-4">
      <Panel className="overflow-hidden">
        <PanelHead className="flex-wrap gap-2 py-2">
          <NetworkIcon className="size-4 text-muted-foreground" />
          <PanelTitle>{network.name}</PanelTitle>
          <Badge variant="secondary">{t("mode", tNetworks(`options.${network.forwardingMode}`))}</Badge>
          <PanelMeta>{t("members", network.members.length)}</PanelMeta>
          {canManage && (
            <PanelActions>
              <Button
                size="sm"
                variant="ghost"
                disabled={change.isPending}
                onClick={() =>
                  void confirmRun(
                    { kind: "delete" },
                    {
                      title: t("deleteTitle", network.name),
                      description: t("deleteText"),
                      confirmText: t("deleteNetwork"),
                      cancelText: tNetworks("actions.cancel"),
                      variant: "destructive",
                      icon: Trash2,
                    }
                  )
                }
              >
                <Trash2 />
                {t("deleteNetwork")}
              </Button>
            </PanelActions>
          )}
        </PanelHead>
        <fieldset disabled={!canWrite} className="min-w-0 divide-y divide-border">
          {network.members.map((member) => (
            <MemberRow
              key={member.serverId}
              member={member}
              isDefault={order[0] === member.serverId}
              canUp={order.indexOf(member.serverId) > 0}
              canDown={order.includes(member.serverId) && order.indexOf(member.serverId) < order.length - 1}
              canLeaveTry={order.length > 1}
              busy={change.isPending}
              onMove={(by) => move(member.serverId, by)}
              onToggleTry={() => toggleTry(member.serverId)}
              onRemove={() =>
                void confirmRun(
                  { kind: "remove", serverId: member.serverId },
                  {
                    title: t("removeTitle", member.name),
                    description: t("removeText"),
                    confirmText: t("remove"),
                    cancelText: tNetworks("actions.cancel"),
                    variant: "destructive",
                    icon: Trash2,
                  }
                )
              }
            />
          ))}
        </fieldset>
        {canWrite && <AddMemberForm network={network} onAdded={(ids) => setRestart((prev) => [...new Set([...prev, ...ids])])} />}
      </Panel>

      {network.forwardingMode === "modern" && (
        <Panel>
          <div className="flex flex-wrap items-center gap-3 px-4 py-3">
            <KeyRound className="size-4 text-muted-foreground" />
            <KeyValue className="min-w-48 flex-1">
              <KeyValueItem label={t("secret")}>
                {network.secret.set ? (network.secret.hint ? t("secretHint", network.secret.hint) : "********") : t("secretNone")}
              </KeyValueItem>
            </KeyValue>
            {canManage && (
              <Button
                size="sm"
                variant="outline"
                disabled={change.isPending}
                onClick={() =>
                  void confirmRun(
                    { kind: "rotate" },
                    { title: t("rotateTitle"), description: t("rotateText"), confirmText: t("rotate"), cancelText: tNetworks("actions.cancel"), icon: RotateCw }
                  )
                }
              >
                <RotateCw />
                {t("rotate")}
              </Button>
            )}
          </div>
        </Panel>
      )}

      <RestartPrompt key={restart.join()} serverIds={restart} />
    </div>
  );
}
