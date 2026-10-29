"use client";
import type { AddBanRequest, AddIpBanRequest, AddOpRequest, UpdatePlayersSettingsRequest } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { confirmDialog } from "@/shared/modals";
import { Ban, Crown, UserMinus, UserX, type LucideIcon } from "lucide-react";
import { useKickPlayerMutation, usePlayersChangeMutation, type PlayersChange } from "../api/players.queries";
import { usePlayersError } from "./usePlayersError";

interface Confirm {
  title: string;
  description: string;
  confirmText: string;
  icon: LucideIcon;
  destructive?: boolean;
}

/** List changes and kicks with confirmation where it undoes something, plus toasts */
export function usePlayerActions(serverId: string) {
  const { t } = useTranslation("modules.players");
  const { notify } = useNotifications();
  const errorText = usePlayersError();
  const change = usePlayersChangeMutation(serverId);
  const kickMutation = useKickPlayerMutation(serverId);

  const ask = ({ destructive, ...options }: Confirm) =>
    confirmDialog({ ...options, cancelText: t("actions.cancel"), variant: destructive ? "destructive" : undefined });

  const report = async (work: Promise<unknown>, success: string) => {
    try {
      await work;
      notify({ type: "success", title: success });
      return true;
    } catch (error) {
      notify({ type: "error", title: errorText(error) });
      return false;
    }
  };

  const run = (next: PlayersChange, success: string) => report(change.mutateAsync(next), success);

  const removeFromWhitelist = async (name: string) =>
    (await ask({ title: t("confirm.removeWhitelist", name), description: t("confirm.removeText"), confirmText: t("actions.remove"), icon: UserMinus })) &&
    run({ kind: "whitelistRemove", name }, t("toasts.whitelistRemove", name));

  const removeOp = async (name: string) =>
    (await ask({ title: t("confirm.deop", name), description: t("confirm.removeText"), confirmText: t("actions.deop"), icon: Crown })) &&
    run({ kind: "opRemove", name }, t("toasts.opRemove", name));

  const pardon = async (name: string) =>
    (await ask({ title: t("confirm.pardon", name), description: t("confirm.pardonText"), confirmText: t("actions.pardon"), icon: Ban })) &&
    run({ kind: "banRemove", name }, t("toasts.banRemove", name));

  const pardonIp = async (ip: string) =>
    (await ask({ title: t("confirm.pardon", ip), description: t("confirm.pardonText"), confirmText: t("actions.pardon"), icon: Ban })) &&
    run({ kind: "ipBanRemove", ip }, t("toasts.banRemove", ip));

  // Bans from the online list skip the form, so they ask first
  const banOnline = async (name: string) =>
    (await ask({ title: t("confirm.ban", name), description: t("confirm.banText"), confirmText: t("actions.ban"), icon: Ban, destructive: true })) &&
    run({ kind: "banAdd", data: { name } }, t("toasts.banAdd", name));

  const kick = async (name: string) =>
    (await ask({ title: t("confirm.kick", name), description: t("confirm.kickText"), confirmText: t("actions.kick"), icon: UserX, destructive: true })) &&
    report(kickMutation.mutateAsync({ name }), t("toasts.kicked", name));

  return {
    pending: change.isPending || kickMutation.isPending,
    addToWhitelist: (name: string) => run({ kind: "whitelistAdd", name }, t("toasts.whitelistAdd", name)),
    addOp: (data: AddOpRequest) => run({ kind: "opAdd", data }, t("toasts.opAdd", data.name)),
    ban: (data: AddBanRequest) => run({ kind: "banAdd", data }, t("toasts.banAdd", data.name)),
    banIp: (data: AddIpBanRequest) => run({ kind: "ipBanAdd", data }, t("toasts.banAdd", data.ip)),
    updateSettings: (data: UpdatePlayersSettingsRequest) => run({ kind: "settings", data }, t("toasts.settings")),
    removeFromWhitelist,
    removeOp,
    pardon,
    pardonIp,
    banOnline,
    kick,
  };
}

export type PlayerActions = ReturnType<typeof usePlayerActions>;
