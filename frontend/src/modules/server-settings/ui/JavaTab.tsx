import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { JavaVersionField } from "@/modules/server/modals/CreateServerModal/wizard/JavaVersionField";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { BlockHeader } from "@/shared/ui/BlockHeader";
import { Card, CardContent, CardHeader } from "@/shared/ui/card";
import { Cpu } from "lucide-react";
import { useRef, useState } from "react";
import { SaveStatus, SaveStatusIndicator } from "./SaveStatusIndicator";

export const JavaTab = () => {
  const { t } = useTranslation("modules.serverSettings");
  const { selectedServer, updateServer } = useServerStore();
  const { notify } = useNotifications();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const resetTimer = useRef<NodeJS.Timeout | null>(null);

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

  const current = selectedServer.variables?.JAVA_VERSION;
  const currentPath = selectedServer.variables?.JAVA_PATH;

  const saveJavaVariables = async (
    variables: Record<string, string | number>
  ) => {
    setSaveStatus("saving");
    try {
      const response = await api.servers.updateSettings(selectedServer.id, {
        variables,
      });
      updateServer(selectedServer.id, response);
      setSaveStatus("success");
      notify({ title: t("notifications.javaSettingsUpdated"), type: "success" });
    } catch (e: any) {
      setSaveStatus("error");
      notify({
        title: e.message || t("notifications.failedToUpdateJavaSettings"),
        type: "error",
      });
    }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setSaveStatus("idle"), 2000);
  };

  const updateJavaVersion = (version: number) =>
    saveJavaVariables({ JAVA_VERSION: version, JAVA_PATH: "" });

  // Clearing ("") comes with a version pick, updateJavaVersion already resets JAVA_PATH
  const updateJavaPath = async (path: string) => {
    if (path) await saveJavaVariables({ JAVA_PATH: path });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <BlockHeader
            kicker={t("java.title")}
            title={t("java.title")}
            description={t("java.description")}
            icon={Cpu}
            color="green"
            actions={<SaveStatusIndicator status={saveStatus} />}
          />
        </CardHeader>
        <CardContent className="space-y-4">
          <JavaVersionField
            label={t("java.javaVersion")}
            value={current as number | undefined}
            onChange={updateJavaVersion}
            pathValue={(currentPath as string | undefined) || ""}
            // Docker images ship their own Java, no host path override there
            onPathChange={
              selectedServer.runtimeKind === "docker"
                ? undefined
                : updateJavaPath
            }
          />
        </CardContent>
      </Card>
    </div>
  );
};
