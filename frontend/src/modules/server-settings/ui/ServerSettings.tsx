"use client";

import { useServerStore } from "@/modules/server";
import { SaveConfirmationModalRegistration } from "@/modules/server-settings/modals/SaveConfirmationModal";
import { GameplayTab } from "@/modules/server-settings/ui/GameplayTab";
import { GeneralTab } from "@/modules/server-settings/ui/GeneralTab";
import { InformationTab } from "@/modules/server-settings/ui/InformationTab";
import { JavaTab } from "@/modules/server-settings/ui/JavaTab";
import { NetworkTab } from "@/modules/server-settings/ui/NetworkTab";
import { OthersTab } from "@/modules/server-settings/ui/OthersTab";
import { WorldTab } from "@/modules/server-settings/ui/WorldTab";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { settingsTabAllowedByBlueprint } from "@/shared/lib/serverRestrictions";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Button } from "@/shared/ui/button";
import { PageLayout } from "@/shared/ui/PageLayout";
import { PageTabsHeader } from "@/shared/ui/PageTabsHeader";
import { StatusButton } from "@/shared/ui/status-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  BookMarked,
  Coffee,
  Earth,
  GamepadDirectional,
  Network,
  RectangleEllipsis,
  RotateCcw,
  Save,
  Server,
  Settings2,
} from "lucide-react";
import { useState } from "react";
import { useServerSettings } from "../hooks/useServerSettings";

// Tabs that require manual save (server.properties)
const PROPERTIES_TABS = [
  "information",
  "gameplay",
  "world",
  "network",
  "other",
];

export const ServerSettings = () => {
  const { t } = useTranslation("modules.serverSettings");
  const [activeTab, setActiveTab] = useState("general");
  const { selectedServer } = useServerStore();

  // Blueprint metadata drives which settings tabs are available
  const serverBlueprint = useBlueprint(selectedServer?.blueprintId);
  const showTab = (tab: string) =>
    serverBlueprint
      ? settingsTabAllowedByBlueprint(tab, serverBlueprint)
      : true;

  const {
    settings,
    otherProperties,
    updateSetting,
    updateOtherProperty,
    addOtherProperty,
    removeOtherProperty,
    handleSave,
    handleReset,
  } = useServerSettings();

  const showSaveButton =
    PROPERTIES_TABS.includes(activeTab) && showTab("information");

  return (
    <>
      <PageLayout>
        <BlockHeader
          kicker={t("header.title")}
          title={t("header.title")}
          description={t("header.description")}
          icon={Settings2}
          color="blue"
        />
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-2"
        >
          <PageTabsHeader
            tabs={
              <TabsList>
                <TabsTrigger
                  value="general"
                  className="flex items-center gap-2"
                >
                  <Server className="h-4 w-4" />
                  {t("tabs.general")}
                </TabsTrigger>

                {showTab("java") && (
                  <TabsTrigger value="java" className="flex items-center gap-2">
                    <Coffee className="h-4 w-4" />
                    {t("tabs.java")}
                  </TabsTrigger>
                )}

                {showTab("information") && (
                  <>
                    <div className="mx-3 h-4 w-[1px] rounded-sm bg-foreground/20" />

                    <TabsTrigger
                      value="information"
                      className="flex items-center gap-2"
                    >
                      <BookMarked className="h-4 w-4" />
                      {t("tabs.information")}
                    </TabsTrigger>

                    <TabsTrigger
                      value="gameplay"
                      className="flex items-center gap-2"
                    >
                      <GamepadDirectional className="h-4 w-4" />
                      {t("tabs.gameplay")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="world"
                      className="flex items-center gap-2"
                    >
                      <Earth className="h-4 w-4" />
                      {t("tabs.world")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="network"
                      className="flex items-center gap-2"
                    >
                      <Network className="h-4 w-4" />
                      {t("tabs.network")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="other"
                      className="flex items-center gap-2"
                    >
                      <RectangleEllipsis className="h-4 w-4" />
                      {t("tabs.other")}
                    </TabsTrigger>
                  </>
                )}
              </TabsList>
            }
            actions={
              showSaveButton && (
                <div className="flex flex-shrink-0 gap-2 md:space-x-3">
                  <Button variant="secondary" onClick={handleReset}>
                    <RotateCcw className="h-4 w-4" />
                    {t("tabs.reset")}
                  </Button>
                  <StatusButton
                    onSave={handleSave}
                    idleText={t("tabs.saveChanges")}
                    loadingText={t("tabs.saving")}
                    successText={t("tabs.saved")}
                    errorText={t("tabs.error")}
                    idleIcon={<Save className="h-4 w-4" />}
                  />
                </div>
              )
            }
          />

          <TabsContent value="general">
            <GeneralTab />
          </TabsContent>

          {showTab("java") && (
            <TabsContent value="java">
              <JavaTab />
            </TabsContent>
          )}

          {showTab("information") && (
            <>
              <TabsContent value="information">
                <InformationTab
                  settings={settings}
                  onUpdateSetting={updateSetting}
                />
              </TabsContent>

              <TabsContent value="gameplay">
                <GameplayTab
                  settings={settings}
                  onUpdateSetting={updateSetting}
                />
              </TabsContent>

              <TabsContent value="world">
                <WorldTab settings={settings} onUpdateSetting={updateSetting} />
              </TabsContent>

              <TabsContent value="network">
                <NetworkTab
                  settings={settings}
                  onUpdateSetting={updateSetting}
                />
              </TabsContent>

              <TabsContent value="other">
                <OthersTab
                  properties={otherProperties}
                  onUpdateProperty={updateOtherProperty}
                  onAddProperty={addOtherProperty}
                  onRemoveProperty={removeOtherProperty}
                />
              </TabsContent>
            </>
          )}
        </Tabs>
      </PageLayout>

      <SaveConfirmationModalRegistration />
    </>
  );
};
