"use client";

import { DynamicExtensionComponent, ExtensionSlot, useExtensionSettingsPanels } from "@/modules/extensions";
import { useTranslation } from "@/shared/hooks/useTranslation";
import type { AccessRequirement } from "@/shared/lib/access";
import { meetsAccess } from "@/shared/lib/access";
import { useAuthStore } from "@/shared/stores/auth-store";
import { DataReveal, useTabReveal } from "@/shared/ui/data-reveal";
import { PageHeader } from "@/shared/ui/page-header";
import { SaveBar } from "@/shared/ui/settings";
import { Tabs, TabsContent, TabsList, TabsSeparator, TabsTrigger } from "@/shared/ui/tabs";
import { AccessArea } from "@shared/access/areas";
import { AlertTriangle, Blocks, Cloud, Globe, Info, KeyRound, Lock, Send, Shield, ShieldCheck, SlidersHorizontal, Sparkles, Users, type LucideIcon } from "lucide-react";
import { useRouteTab } from "@/shared/hooks/useRouteTab";
import { CrashScreen } from "@/shared/ui/ErrorBoundary";
import { useSearchParams } from "next/navigation";
import { Fragment, lazy, Suspense, useRef } from "react";
import { useForm, useWatch } from "react-hook-form";
import { SAMPLE_CONFIG_FORM } from "../data/samples";
import { useConfigForm } from "../hooks/useConfigForm";
import { SETTINGS_EXT_TAB, SETTINGS_TABS, type SettingsTabId } from "../lib/tabs";
import type { MainConfigFormData } from "../validations/schema";
import AboutPanel from "./AboutPanel";
import ApiKeysTab from "./ApiKeysTab";
import AssistantSettings from "./AssistantSettings";
import GeneralSettings from "./GeneralSettings";
import RoleManagement from "./RoleManagement";
import SecuritySettings from "./SecuritySettings";
import SessionsTab from "./SessionsTab";
import TelegramSettings from "./TelegramSettings";
import TwoFactorTab from "./TwoFactorTab";
import UserManagement from "./UserManagement";

type ConfigTab = "general" | "security" | "telegram";
const CONFIG_TABS: Record<ConfigTab, true> = { general: true, security: true, telegram: true };

const BackupStoragesSettings = lazy(() => import("@/modules/backups/ui/storages/BackupStoragesSettings").then((m) => ({ default: m.BackupStoragesSettings })));

// Personal tabs (sessions, 2FA, about) are open to everyone who reaches the page
const TABS: { id: SettingsTabId; icon: LucideIcon; separatorBefore?: boolean; access?: AccessRequirement }[] = [
  { id: "general", icon: SlidersHorizontal, access: [AccessArea.PANEL, "manage"] },
  { id: "security", icon: Shield, access: [AccessArea.PANEL, "manage"] },
  { id: "telegram", icon: Send, access: [AccessArea.PANEL, "manage"] },
  { id: "storages", icon: Cloud, access: [AccessArea.STORAGES, "read"] },
  { id: "assistant", icon: Sparkles, access: [AccessArea.ASSISTANT, "manage"] },
  { id: "users", icon: Users, separatorBefore: true, access: [AccessArea.ACCOUNTS, "read"] },
  { id: "roles", icon: ShieldCheck, access: [AccessArea.ACCOUNTS, "read"] },
  { id: "api", icon: KeyRound, access: [AccessArea.API, "write"] },
  { id: "sessions", icon: Globe },
  { id: "twofa", icon: Lock },
  { id: "about", icon: Info },
];

// Which tab shows each top level config field
const FIELD_TAB: Record<string, ConfigTab> = {
  port: "general",
  ftpd: "general",
  subnetsAccessRestriction: "security",
  telemetry: "security",
  telegramBot: "telegram",
  skinName: "general",
  serverStats: "general",
};

const BASE = "/panel-settings";
const ROUTE_TABS = [...SETTINGS_TABS, SETTINGS_EXT_TAB] as const;

export default function Settings() {
  const { t } = useTranslation("modules.settings");
  // Extension labels are full keys like "ext.sentinel.settings"
  const { t: tGlobal } = useTranslation();
  const canAccessItem = useAuthStore((s) => s.canAccessItem);
  const user = useAuthStore((s) => s.user);
  const tabs = TABS.filter((item) => meetsAccess(user, item.access));
  const panels = useExtensionSettingsPanels().filter((panel) => canAccessItem(panel.permission));
  const config = useConfigForm();
  const sampleForm = useForm<MainConfigFormData>({ defaultValues: SAMPLE_CONFIG_FORM });
  const [routeTab, setRouteTab] = useRouteTab(BASE, ROUTE_TABS, "general");
  const panelParam = useSearchParams().get("panel");
  const tab = routeTab === SETTINGS_EXT_TAB ? `ext:${panelParam ?? ""}` : routeTab;

  // Loaded config can already be invalid, so errors come from the live values rather than touched fields
  const values = useWatch({ control: config.form.control });
  const parsed = config.schema.safeParse(values);
  const tabsWithErrors = new Set(parsed.success ? [] : parsed.error.issues.map((issue) => FIELD_TAB[String(issue.path[0])]));

  const tabIds = [...tabs.map((item) => item.id as string), ...panels.map((panel) => `ext:${panel.extId}:${panel.id}`)];
  const active = tabIds.includes(tab) ? tab : (tabIds[0] ?? "about");
  const tabsRef = useRef<HTMLDivElement>(null);
  useTabReveal(tabsRef, active);

  const changeTab = (next: string) => {
    if (next.startsWith("ext:")) {
      const panel = encodeURIComponent(next.slice("ext:".length));
      window.history.replaceState(null, "", `${BASE}/${SETTINGS_EXT_TAB}?panel=${panel}`);
    } else {
      setRouteTab(next as SettingsTabId);
    }
  };

  return (
    <div className="stagger-enter">
      <PageHeader title={t("title")} description={t("description")} />
      <Tabs ref={tabsRef} value={active} onValueChange={(value) => changeTab(String(value))} className="gap-5">
        <div className="sticky top-0 z-10 w-fit max-w-full rounded-lg bg-background">
          <TabsList>
            {tabs.map(({ id, icon: Icon, separatorBefore }) => (
              <Fragment key={id}>
                {separatorBefore && <TabsSeparator />}
                <TabsTrigger value={id}>
                  <Icon />
                  {t(`tabs.${id}`)}
                  {tabsWithErrors.has(id as ConfigTab) && <AlertTriangle className="size-3.5 text-danger" aria-label={t("tabs.hasErrors")} />}
                </TabsTrigger>
              </Fragment>
            ))}
            {panels.map((panel) => (
              <TabsTrigger key={`${panel.extId}:${panel.id}`} value={`ext:${panel.extId}:${panel.id}`}>
                <Blocks />
                {tGlobal(panel.label)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* The skeleton gets its own throwaway form so the real one never registers sample fields */}
        {/* Empty on other tabs, it would add a second gap */}
        <DataReveal
          id={`settings-config-${active}`}
          data={config.form}
          loading={config.loading}
          sample={sampleForm}
          className={active in CONFIG_TABS ? undefined : "hidden"}
        >
          {(form) => (
            <>
              <TabsContent value="general">
                <GeneralSettings form={form} />
              </TabsContent>
              <TabsContent value="security">
                <SecuritySettings form={form} />
              </TabsContent>
              <TabsContent value="telegram">
                <TelegramSettings form={form} />
              </TabsContent>
            </>
          )}
        </DataReveal>
        <TabsContent value="storages">
          <Suspense fallback={null}>
            <BackupStoragesSettings />
          </Suspense>
        </TabsContent>
        <TabsContent value="assistant">
          <AssistantSettings />
        </TabsContent>
        <TabsContent value="users">
          <UserManagement />
        </TabsContent>
        <TabsContent value="roles">
          <RoleManagement />
        </TabsContent>
        <TabsContent value="api">
          <ApiKeysTab />
        </TabsContent>
        <TabsContent value="sessions">
          <SessionsTab />
        </TabsContent>
        <TabsContent value="twofa">
          <TwoFactorTab />
        </TabsContent>
        <TabsContent value="about">
          <AboutPanel />
        </TabsContent>
        {panels.map((panel) => (
          <TabsContent key={`${panel.extId}:${panel.id}`} value={`ext:${panel.extId}:${panel.id}`}>
            <DynamicExtensionComponent bundleUrl={panel.bundleUrl} name={panel.component} fallback={(props) => <CrashScreen {...props} />} />
          </TabsContent>
        ))}
      </Tabs>

      <SaveBar count={config.changes} saving={config.saving} onSave={() => void config.save()} onReset={config.reset} />
      <ExtensionSlot name="settings.footer" />
    </div>
  );
}
