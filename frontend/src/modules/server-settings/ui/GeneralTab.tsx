"use client";

import { BlueprintVariableField } from "@/modules/server/modals/CreateServerModal/wizard/BlueprintVariableField";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { useBlueprint } from "@/modules/server-types/api/server-types.queries";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Sliders } from "lucide-react";
import { useSaveStatus } from "../hooks/useSaveStatus";
import { useServerGeneralSettings } from "../hooks/useServerGeneralSettings";
import { useServerIconUpload } from "../hooks/useServerIconUpload";
import { AutoRestartCard } from "./cards/AutoRestartCard";
import { BasicInformationCard } from "./cards/BasicInformationCard";
import { SaveStatusIndicator } from "./SaveStatusIndicator";

export const GeneralTab = () => {
  const { t } = useTranslation("modules.serverSettings");
  const { saveStatus, setSaveStatus } = useSaveStatus();
  const {
    selectedServer,
    serverName,
    restartOnError,
    variables,
    handleServerNameChange,
    handleServerNameBlur,
    handleRestartOnErrorChange,
    handleRestartAttemptsChange,
    setVariable,
  } = useServerGeneralSettings({ setSaveStatus });
  const {
    fileInputRef,
    isUploadingIcon,
    iconPreview,
    iconUrl,
    handleIconUpload,
  } = useServerIconUpload({
    serverId: selectedServer?.id,
  });
  const blueprint = useBlueprint(selectedServer?.blueprintId);

  if (!selectedServer) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            No server selected
          </p>
        </CardContent>
      </Card>
    );
  }

  // Variables editable after install, minus the version (core is already provisioned) and Java
  // version (handled on its own tab)
  const editableVariables = (blueprint?.variables ?? []).filter(
    (v) =>
      v.userEditable !== false &&
      v.editableAfterInstall !== false &&
      v.key !== "JAVA_VERSION" &&
      v.options?.from !== "versions"
  );

  return (
    <div className="space-y-6">
      <BasicInformationCard
        t={t}
        saveStatus={saveStatus}
        fileInputRef={fileInputRef}
        isUploadingIcon={isUploadingIcon}
        iconPreview={iconPreview}
        iconUrl={iconUrl}
        onIconUpload={handleIconUpload}
        serverName={serverName}
        onServerNameChange={handleServerNameChange}
        onServerNameBlur={handleServerNameBlur}
      />

      {editableVariables.length > 0 && (
        <Card>
          <CardHeader>
            <BlockHeader
              kicker={t("tabs.general")}
              title={t("tabs.general")}
              icon={Sliders}
              color="blue"
              actions={<SaveStatusIndicator status={saveStatus} />}
            />
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {editableVariables.map((variable) => (
              <BlueprintVariableField
                key={variable.key}
                variable={variable}
                value={variables[variable.key]}
                onChange={(value) => setVariable(variable.key, value)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      <AutoRestartCard
        t={t}
        saveStatus={saveStatus}
        restartOnError={restartOnError}
        onRestartOnErrorChange={handleRestartOnErrorChange}
        onRestartAttemptsChange={handleRestartAttemptsChange}
      />
    </div>
  );
};
