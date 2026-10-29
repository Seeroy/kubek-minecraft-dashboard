"use client";
import type { IMainConfig } from "@shared/types/configs/mainConfig.types";
import { useNotifications } from "@/modules/notifications";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useMainConfig, useUpdateMainConfigMutation } from "@/shared/queries";
import { useAuthStore } from "@/shared/stores/auth-store";
import { qk } from "@/shared/queries/query-keys";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useForm, type FieldValues } from "react-hook-form";
import { useUpdatePreferencesMutation } from "../api/twofa.queries";
import { createMainConfigSchema, type MainConfigFormData } from "../validations/schema";

const toFormValues = (config: IMainConfig, skinName: string | null | undefined): MainConfigFormData => ({
  ftpd: { enabled: !!config.ftpd?.enabled, port: config.ftpd?.port ?? 21 },
  subnetsAccessRestriction: config.subnetsAccessRestriction ?? {
    enabled: false,
    subnets: [],
  },
  telegramBot: config.telegramBot ?? { enabled: false, token: "", chatIds: [] },
  telemetry: config.telemetry ?? { enabled: true },
  serverStats: config.serverStats ?? { enabled: true },
  port: config.port || 8080,
  skinName: skinName ?? "",
});

// dirtyFields mirrors the form shape with true at every changed leaf
const countLeaves = (node: unknown): number =>
  node === true ? 1 : node && typeof node === "object" ? Object.values(node as FieldValues).reduce<number>((sum, child) => sum + countLeaves(child), 0) : 0;

/** The panel config form shared by the General, Security and Telegram tabs, plus the user's avatar nickname */
export function useConfigForm() {
  const { t } = useTranslation("modules.settings");
  const { notify } = useNotifications();
  const config = useMainConfig();
  const update = useUpdateMainConfigMutation();
  const queryClient = useQueryClient();
  const updatePreferences = useUpdatePreferencesMutation();
  const currentSkinName = useAuthStore((s) => s.user?.skinName);
  const updateUser = useAuthStore((s) => s.updateUser);

  const secrets = config.data?.secrets;
  // Secret fields are required only until a value is stored
  const schema = useMemo(() => createMainConfigSchema(secrets), [secrets]);
  const resolver = useMemo(() => zodResolver(schema), [schema]);

  const form = useForm<MainConfigFormData>({
    resolver,
    // Server data flows in through values, edits survive a background refetch
    values: config.data ? toFormValues(config.data, currentSkinName) : undefined,
    resetOptions: { keepDirtyValues: true },
    mode: "onChange",
  });

  const save = form.handleSubmit(async ({ skinName, ...values }) => {
    if (!config.data) return;
    // Only send what changed, the nickname goes to the user and not the panel config
    const { skinName: skinChanged, ...configChanges } = form.formState.dirtyFields;
    const [saved, prefs] = await Promise.all([
      countLeaves(configChanges) > 0 ? update.mutateAsync(values) : config.data,
      skinChanged ? updatePreferences.mutateAsync({ skinName: skinName || null }) : null,
    ]);
    if (prefs) updateUser({ skinName: prefs.skinName });
    // reset() inherits keepDirtyValues from resetOptions, which would keep saved fields dirty
    form.reset(toFormValues(saved, prefs ? prefs.skinName : skinName), {
      keepDirtyValues: false,
    });
    // Columns and panels follow the sampling switch right away
    if (configChanges.serverStats)
      void queryClient.invalidateQueries({
        queryKey: qk.systemMonitoring.serverStats(),
      });
    // The bot restarts on save, its info and photo are fetched again
    if (configChanges.telegramBot) void queryClient.invalidateQueries({ queryKey: qk.telegram.all });
    // Turning FTP on creates your password on the backend
    if (configChanges.ftpd) void queryClient.invalidateQueries({ queryKey: qk.auth.profile() });
    notify({ type: "success", title: t("saved") });
  });

  return {
    form,
    schema,
    loading: config.isLoading,
    saving: update.isPending || updatePreferences.isPending,
    changes: countLeaves(form.formState.dirtyFields),
    save,
    reset: () => form.reset(undefined, { keepDirtyValues: false }),
  };
}
