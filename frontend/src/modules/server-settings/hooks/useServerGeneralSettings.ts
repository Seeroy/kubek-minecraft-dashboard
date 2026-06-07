import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { useEffect, useState } from "react";
import { SaveStatus } from "../ui/SaveStatusIndicator";

type RestartOnError = { enabled: boolean; attempts: number };

interface UseServerGeneralSettingsArgs {
  setSaveStatus: (status: SaveStatus) => void;
}

/**
 * State and persistence for the General tab
 */
export const useServerGeneralSettings = ({
  setSaveStatus,
}: UseServerGeneralSettingsArgs) => {
  const { selectedServer, updateServer } = useServerStore();
  const { notify } = useNotifications();

  const [serverName, setServerName] = useState("");
  const [restartOnError, setRestartOnError] = useState<RestartOnError>({
    enabled: false,
    attempts: 3,
  });

  // Fetch the full server record when the selected server id changes
  useEffect(() => {
    if (!selectedServer) return;
    let cancelled = false;
    api.servers
      .getById(selectedServer.id)
      .then((response) => {
        if (cancelled || !response) return;
        updateServer(selectedServer.id, response);
        setServerName(response.name || "");
        setRestartOnError(
          response.restartOnError || { enabled: false, attempts: 3 }
        );
      })
      .catch((error) =>
        console.error("Failed to fetch full server data:", error)
      );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServer?.id]);

  const persist = async (
    updates: Parameters<typeof api.servers.updateSettings>[1]
  ) => {
    if (!selectedServer) return;
    setSaveStatus("saving");
    try {
      const response = await api.servers.updateSettings(
        selectedServer.id,
        updates
      );
      updateServer(selectedServer.id, response);
      setSaveStatus("success");
      notify({ title: "Setting updated successfully", type: "success" });
    } catch (error: any) {
      setSaveStatus("error");
      notify({
        title: error.message || "Failed to update setting",
        type: "error",
      });
    }
  };

  const handleServerNameChange = (value: string) => setServerName(value);
  const handleServerNameBlur = () => {
    if (serverName !== selectedServer?.name) persist({ name: serverName });
  };

  const handleRestartOnErrorChange = (enabled: boolean) => {
    const next = { ...restartOnError, enabled };
    setRestartOnError(next);
    persist({ restartOnError: next });
  };

  const handleRestartAttemptsChange = (attempts: number) => {
    const next = { ...restartOnError, attempts };
    setRestartOnError(next);
    persist({ restartOnError: next });
  };

  const setVariable = (key: string, value: string | number | boolean) =>
    persist({ variables: { [key]: value } });

  return {
    selectedServer,
    serverName,
    restartOnError,
    variables: selectedServer?.variables ?? {},
    handleServerNameChange,
    handleServerNameBlur,
    handleRestartOnErrorChange,
    handleRestartAttemptsChange,
    setVariable,
  };
};
