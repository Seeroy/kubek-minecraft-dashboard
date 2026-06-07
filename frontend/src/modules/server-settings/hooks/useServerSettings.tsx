import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useServerStore } from "@/modules/server";
import { SAVE_CONFIRMATION_MODAL_ID } from "@/modules/server-settings/modals/SaveConfirmationModal";
import { useModal } from "@/shared/hooks/useModalsManager";
import { useEffect, useState } from "react";
import { ServerProperty } from "../types";

// List of main properties that have dedicated UI controls
const MAIN_PROPERTIES = [
  "motd",
  "max-players",
  "online-mode",
  "white-list",
  "difficulty",
  "gamemode",
  "pvp",
  "hardcore",
  "allow-flight",
  "spawn-protection",
  "level-seed",
  "view-distance",
  "simulation-distance",
  "max-world-size",
  "generate-structures",
  "allow-nether",
  "spawn-animals",
  "spawn-monsters",
  "spawn-npcs",
  "server-port",
  "query.port",
];

export const useServerSettings = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [otherProperties, setOtherProperties] = useState<ServerProperty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { openModal } = useModal();
  const { selectedServer } = useServerStore();
  const { notify } = useNotifications();

  useEffect(() => {
    if (!selectedServer) {
      setIsLoading(false);
      return;
    }

    const loadProperties = async () => {
      setIsLoading(true);
      try {
        const response = await api.servers.getProperties(selectedServer.id);
        setSettings(response);

        const otherProps = Object.entries(response)
          .filter(([key]) => !MAIN_PROPERTIES.includes(key))
          .map(([key, value]) => ({ key, value: value ? String(value) : "" }));

        setOtherProperties(otherProps);
      } catch (error: any) {
        notify({
          title: error.message || "Failed to load server properties",
          type: "error",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProperties();
  }, [selectedServer?.id]);

  const updateSetting = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateOtherProperty = (
    index: number,
    field: keyof ServerProperty,
    newValue: string
  ) => {
    setOtherProperties((prev) =>
      prev.map((prop, i) =>
        i === index ? { ...prop, [field]: newValue } : prop
      )
    );
  };

  const addOtherProperty = () => {
    setOtherProperties((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeOtherProperty = (index: number) => {
    setOtherProperties((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedServer) {
      throw new Error("No server selected");
    }

    const allSettings = {
      ...settings,
      ...Object.fromEntries(
        otherProperties.map((prop) => [prop.key, prop.value])
      ),
    };

    try {
      await api.servers.saveProperties(selectedServer.id, allSettings);

      // Open the confirmation modal
      openModal(SAVE_CONFIRMATION_MODAL_ID, {
        onConfirm: handleServerRestart,
        onCancel: handleSaveWithoutRestart,
      });

      // Return successfully after saving
      return allSettings;
    } catch (error: any) {
      // Log the error for debugging
      console.error("Failed to save server properties:", error);
      // Re-throw with a clear error message
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to save server properties";
      throw new Error(errorMessage);
    }
  };

  const handleServerRestart = async () => {
    if (!selectedServer) return;

    try {
      await api.servers.restart(selectedServer.id);
      notify({ title: "Server restart initiated", type: "success" });
    } catch (error: any) {
      notify({
        title: error.message || "Failed to restart server",
        type: "error",
      });
    }
  };

  const handleSaveWithoutRestart = () => {
    notify({
      title:
        "Settings saved successfully. Restart server later to apply all changes.",
      type: "success",
    });
  };

  const handleReset = async () => {
    if (!selectedServer) return;

    try {
      const response = await api.servers.getProperties(selectedServer.id);
      setSettings(response);

      const otherProps = Object.entries(response)
        .filter(([key]) => !MAIN_PROPERTIES.includes(key))
        .map(([key, value]) => ({ key, value: String(value) }));

      setOtherProperties(otherProps);
      notify({ title: "Settings reset to saved values", type: "success" });
    } catch (error: any) {
      notify({
        title: error.message || "Failed to reset settings",
        type: "error",
      });
    }
  };

  return {
    settings,
    otherProperties,
    isLoading,
    updateSetting,
    updateOtherProperty,
    addOtherProperty,
    removeOtherProperty,
    handleSave,
    handleReset,
  };
};
