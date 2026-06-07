import { api } from "@/api";
import type { useNotifications } from "@/modules/notifications";
import { Download, TriangleAlert } from "lucide-react";

type Notifier = ReturnType<typeof useNotifications>;

/**
 * Download the server archive via an authenticated request and trigger browser save dialog
 */
export async function triggerServerExport(
  serverId: string,
  serverName: string,
  notifier: Notifier,
  labels: {
    triggerTitle: string;
    triggerMessage: string;
    readyTitle: string;
    readyMessage: string;
    errorTitle: string;
  }
): Promise<void> {
  const toastId = notifier.notify({
    type: "progress",
    title: labels.triggerTitle,
    message: labels.triggerMessage,
    icon: Download,
    duration: 0,
  });

  try {
    const { blob, filename } = await api.servers.exportArchive(serverId);
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    notifier.update(toastId, {
      type: "success",
      title: labels.readyTitle,
      message: labels.readyMessage,
      icon: Download,
      duration: 4000,
    });
  } catch (e: any) {
    notifier.update(toastId, {
      type: "error",
      title: labels.errorTitle,
      message: e?.message,
      icon: TriangleAlert,
      duration: 6000,
    });
  }
}
