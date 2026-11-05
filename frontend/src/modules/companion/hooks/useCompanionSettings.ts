"use client";

import type { CompanionSettings } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useAccess } from "@/shared/lib/access";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { AccessArea } from "@shared/access/areas";
import { useCompanionSettingsMutation } from "../api/companion.queries";
import { useCompanion } from "./useCompanion";

export type CompanionSettingKey = keyof CompanionSettings;

/** Feed types, in the order they're listed */
export const FEED_SETTINGS: CompanionSettingKey[] = ["sessions", "kicks", "deaths", "chat"];

/** Saved settings plus a switch handler, each flip is saved right away */
export function useCompanionSettings(serverId: string) {
  const { t } = useTranslation("modules.companion.settings");
  const { notify } = useNotifications();
  const { overview } = useCompanion(serverId);
  const mutation = useCompanionSettingsMutation(serverId);
  const canEdit = useAccess([AccessArea.SETTINGS, "write"], serverId);

  const toggle = (key: CompanionSettingKey, value: boolean) =>
    mutation.mutate({ [key]: value }, { onError: (error) => notify({ type: "error", title: t("failed"), message: getApiErrorMessage(error) }) });

  return { settings: overview?.settings, canEdit, pending: mutation.isPending, toggle };
}
