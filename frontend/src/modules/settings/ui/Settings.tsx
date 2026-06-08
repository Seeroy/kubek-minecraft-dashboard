"use client";

import type { Account } from "@/api";
import {
  DynamicExtensionComponent,
  ExtensionSlot,
  useExtensionSettingsPanels,
} from "@/modules/extensions";
import { useNotifications } from "@/modules/notifications";
import {
  MainConfigFormData,
  mainConfigSchema,
} from "@/modules/settings/validations/schema";
import { useTranslation } from "@/shared/hooks/useTranslation";
import {
  useAccounts,
  useCreateAccountMutation,
  useDeleteAccountMutation,
  useUpdateAccountMutation,
} from "@/modules/settings/api/accounts.queries";
import { useMainConfig, useUpdateMainConfigMutation } from "@/shared/queries";
import { useAuthStore } from "@/shared/stores/auth-store";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { PageLayout } from "@/shared/ui/PageLayout";
import { PageLoading } from "@/shared/ui/PageLoading";
import { PageTabsHeader } from "@/shared/ui/PageTabsHeader";
import { StatusButton } from "@/shared/ui/status-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { zodResolver } from "@hookform/resolvers/zod";
import { IUser, UserPermissions } from "@shared/types/user.types";
import {
  Blocks,
  Bot,
  Info,
  KeyRound,
  Save,
  Server,
  Shield,
  ShieldCheck,
  Sliders,
  Users,
} from "lucide-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import AboutPanel from "./AboutPanel";
import GeneralSettings from "./GeneralSettings";
import SecuritySettings from "./SecuritySettings";
import SessionsTab from "./SessionsTab";
import TelegramSettings from "./TelegramSettings";
import TwoFactorTab from "./TwoFactorTab";
import UserManagement from "./UserManagement";

const accountToUser = (account: Account): IUser => ({
  id: account.id,
  username: account.username,
  password: "",
  secret: "",
  permissions: account.permissions as UserPermissions[],
  serversRestrict: account.serversRestrict || { enabled: false, allowed: [] },
  isAdmin: account.permissions.includes(UserPermissions.KUBEK_SETTINGS),
});

export default function Settings() {
  const { notify } = useNotifications();
  const { t } = useTranslation("modules.settings");
  // Non-namespaced translator for extension labels like "ext.sentinel.settings"
  const { t: tGlobal } = useTranslation();

  const canAccessItem = useAuthStore((s) => s.canAccessItem);
  const settingsPanels = useExtensionSettingsPanels().filter((p) =>
    canAccessItem(p.permission)
  );

  const configQuery = useMainConfig();
  const accountsQuery = useAccounts();
  const updateConfigMutation = useUpdateMainConfigMutation();
  const createAccountMutation = useCreateAccountMutation();
  const updateAccountMutation = useUpdateAccountMutation();
  const deleteAccountMutation = useDeleteAccountMutation();

  const form = useForm<MainConfigFormData>({
    resolver: zodResolver(mainConfigSchema),
    defaultValues: {
      ftpd: { enabled: false, username: "admin", password: "", port: 21 },
      authorization: true,
      subnetsAccessRestriction: { enabled: false, subnets: [] },
      telegramBot: { enabled: false, token: "", chatIds: [] },
      telemetry: { enabled: true },
      port: 8080,
    },
    mode: "onChange",
  });
  const { isDirty, isValid } = form.formState;

  React.useEffect(() => {
    const config = configQuery.data;
    if (!config) return;
    form.reset({
      ftpd: config.ftpd || {
        enabled: false,
        username: "",
        password: "",
        port: 21,
      },
      authorization: config.authorization ?? true,
      subnetsAccessRestriction: config.subnetsAccessRestriction || {
        enabled: false,
        subnets: [],
      },
      telegramBot: config.telegramBot || {
        enabled: false,
        token: "",
        chatIds: [],
      },
      telemetry: config.telemetry ?? { enabled: true },
      port: config.port || 8080,
    });
  }, [configQuery.data, form]);

  const users: IUser[] = React.useMemo(
    () => (accountsQuery.data ?? []).map(accountToUser),
    [accountsQuery.data]
  );

  const handleSave = async () => {
    const valid = await form.trigger();
    if (!valid) {
      throw new Error("Form validation failed");
    }
    const saved = await updateConfigMutation.mutateAsync(form.getValues());
    form.reset(saved);
    notify({ title: t("notifications.settingsSaved"), type: "success" });
    return saved;
  };

  const handleUserCreate = async (userData: Omit<IUser, "id">) => {
    await createAccountMutation.mutateAsync({
      username: userData.username,
      password: userData.password,
      servers: userData.serversRestrict.enabled
        ? userData.serversRestrict.allowed
        : undefined,
      permissions: userData.permissions,
    });
    notify({ title: t("notifications.userCreated"), type: "success" });
  };

  const handleUserUpdate = async (
    userId: string,
    userData: Partial<Omit<IUser, "id">>
  ) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;

    const updateData: Partial<Account> & { password?: string } = {
      username: userData.username,
      permissions: userData.permissions,
      serversRestrict: userData.serversRestrict,
    };
    if (userData.password) {
      updateData.password = userData.password;
    }

    await updateAccountMutation.mutateAsync({
      username: user.username,
      data: updateData,
    });
    notify({ title: t("notifications.userUpdated"), type: "success" });
  };

  const handleUserDelete = async (userId: string) => {
    const user = users.find((u) => u.id === userId);
    if (!user) return;
    await deleteAccountMutation.mutateAsync(user.username);
    notify({ title: t("notifications.userDeleted"), type: "success" });
  };

  if (configQuery.isLoading || accountsQuery.isLoading) {
    return (
      <PageLayout>
        <BlockHeader
          kicker={t("header.title")}
          title={t("header.title")}
          description={t("header.description")}
          icon={Sliders}
          color="primary"
        />
        <PageLoading />
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <BlockHeader
        kicker={t("header.title")}
        title={t("header.title")}
        description={t("header.description")}
        icon={Sliders}
        color="primary"
      />
      <Tabs defaultValue="general" className="space-y-4">
        <PageTabsHeader
          tabs={
            <TabsList>
              <TabsTrigger value="general" className="flex items-center gap-2">
                <Server className="h-4 w-4" />
                {t("tabs.general")}
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                {t("tabs.security")}
              </TabsTrigger>
              <TabsTrigger value="telegram" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                {t("tabs.telegram")}
              </TabsTrigger>
              <TabsTrigger value="users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                {t("tabs.users")}
              </TabsTrigger>
              <TabsTrigger value="sessions" className="flex items-center gap-2">
                <KeyRound className="h-4 w-4" />
                {t("tabs.sessions")}
              </TabsTrigger>
              <TabsTrigger value="twofa" className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                2FA
              </TabsTrigger>
              <TabsTrigger value="about" className="flex items-center gap-2">
                <Info className="h-4 w-4" />
                {t("tabs.about")}
              </TabsTrigger>
              {settingsPanels.map((p) => (
                <TabsTrigger
                  key={`${p.extId}:${p.id}`}
                  value={`ext:${p.extId}:${p.id}`}
                  className="flex items-center gap-2"
                >
                  <Blocks className="h-4 w-4" />
                  {tGlobal(p.label)}
                </TabsTrigger>
              ))}
            </TabsList>
          }
          actions={
            <StatusButton
              onSave={handleSave}
              idleText={t("buttons.save")}
              loadingText={t("buttons.saving")}
              successText={t("buttons.saved")}
              errorText={t("buttons.error")}
              disabled={!isDirty || !isValid}
              idleIcon={<Save className="h-4 w-4" />}
              className="flex-shrink-0"
            />
          }
        />

        <TabsContent value="general" className="space-y-6">
          <GeneralSettings form={form} />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecuritySettings form={form} />
        </TabsContent>

        <TabsContent value="telegram" className="space-y-6">
          <TelegramSettings form={form} />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <UserManagement
            users={users}
            onUserCreate={handleUserCreate}
            onUserUpdate={handleUserUpdate}
            onUserDelete={handleUserDelete}
          />
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <SessionsTab />
        </TabsContent>

        <TabsContent value="twofa" className="space-y-6">
          <TwoFactorTab />
        </TabsContent>

        <TabsContent value="about" className="space-y-6">
          <AboutPanel />
        </TabsContent>

        {settingsPanels.map((p) => (
          <TabsContent
            key={`${p.extId}:${p.id}`}
            value={`ext:${p.extId}:${p.id}`}
            className="space-y-6"
          >
            <DynamicExtensionComponent
              bundleUrl={p.bundleUrl}
              name={p.component}
            />
          </TabsContent>
        ))}
      </Tabs>

      <ExtensionSlot name="settings.footer" />
    </PageLayout>
  );
}
