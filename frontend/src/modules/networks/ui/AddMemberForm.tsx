"use client";
import type { Network } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { Button } from "@/shared/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Spinner } from "@/shared/ui/spinner";
import { Plus, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { useAddNetworkMemberMutation, useNetworkCandidates } from "../api/networks.queries";
import { networkErrorMessage } from "../lib/errors";

/** Links one more server whose forwarding fits the network */
export function AddMemberForm({ network, onAdded }: { network: Network; onAdded: (restart: string[]) => void }) {
  const { t } = useTranslation("modules.networks.tab");
  const { t: tNetworks } = useTranslation("modules.networks");
  const { notify } = useNotifications();
  const candidates = useNetworkCandidates().data;
  const add = useAddNetworkMemberMutation(network.id);
  const [chosen, setChosen] = useState<string | null>(null);

  const options = (candidates?.backends ?? []).filter((b) => b.modes.includes(network.forwardingMode));
  const label = (id: string) => options.find((o) => o.serverId === id)?.name ?? id;

  const submit = () => {
    if (!chosen) return;
    add.mutate(chosen, {
      onSuccess: (result) => {
        setChosen(null);
        onAdded(result.restart);
      },
      onError: (error) => notify({ type: "error", title: t("addServer"), message: networkErrorMessage(error, tNetworks), icon: TriangleAlert }),
    });
  };

  if (!options.length && !add.isPending) {
    return <p className="border-t border-border px-4 py-3 text-xs text-muted-foreground">{t("noCandidates")}</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
      <Select value={chosen} disabled={add.isPending} onValueChange={(next) => setChosen((next as string | null) ?? null)}>
        <SelectTrigger className="min-w-0 flex-1" aria-label={t("addServer")}>
          <SelectValue placeholder={t("addPlaceholder")}>{(value: string | null) => (value ? label(value) : t("addPlaceholder"))}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.serverId} value={option.serverId}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button disabled={!chosen || add.isPending} onClick={submit}>
        {add.isPending ? <Spinner /> : <Plus />}
        {add.isPending && chosen ? t("adding", label(chosen)) : t("addServer")}
      </Button>
    </div>
  );
}
