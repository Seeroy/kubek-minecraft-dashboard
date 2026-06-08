import { api } from "@/api";
import { useNotifications } from "@/modules/notifications";
import { useRef, useState } from "react";

interface UseServerIconUploadArgs {
  serverId: string | undefined;
}

export const useServerIconUpload = ({ serverId }: UseServerIconUploadArgs) => {
  const { notify } = useNotifications();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(null);

  const iconUrl = serverId ? `servers/${serverId}/icon` : null;

  const handleIconUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !serverId) return;

    if (!file.type.startsWith("image/")) {
      notify({ title: "Please select an image file", type: "error" });
      return;
    }

    setIsUploadingIcon(true);
    try {
      await api.servers.uploadIcon(serverId, file);
      notify({ title: "Server icon uploaded successfully", type: "success" });
      // Force reload by updating timestamp
      setIconPreview(`${iconUrl}&t=${Date.now()}`);
    } catch (error: any) {
      notify({
        title: error?.message || "Failed to upload icon",
        type: "error",
      });
      setIconPreview(null);
    } finally {
      setIsUploadingIcon(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return {
    fileInputRef,
    isUploadingIcon,
    iconPreview,
    iconUrl,
    handleIconUpload,
  };
};
