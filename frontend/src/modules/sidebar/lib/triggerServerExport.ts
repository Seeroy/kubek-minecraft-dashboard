import { api } from "@/api";
import type { useNotifications } from "@/modules/notifications";
import { getApiErrorMessage } from "@/shared/lib/get-api-error-message";
import { type ITask, TaskStatus } from "@shared/types/task.types";
import { Download, TriangleAlert } from "lucide-react";

type Notifier = ReturnType<typeof useNotifications>;
type TaskWaiter = (taskId: string, onUpdate?: (task: ITask) => void) => Promise<ITask>;

/**
 * Pack the server in a backend task, then download the archive
 * One toast follows both steps with its own progress
 */
export async function triggerServerExport(
  serverId: string,
  notifier: Notifier,
  waitForTask: TaskWaiter,
  labels: {
    triggerTitle: string;
    packingMessage: string;
    downloadingMessage: string;
    readyTitle: string;
    readyMessage: string;
    errorTitle: string;
  }
): Promise<void> {
  const toastId = notifier.notify({
    type: "progress",
    title: labels.triggerTitle,
    message: labels.packingMessage,
    icon: Download,
    progress: 0,
    duration: 0,
  });

  let lastPercent = 0;
  const setProgress = (percent: number) => {
    if (percent === lastPercent) return;
    lastPercent = percent;
    notifier.update(toastId, { progress: percent });
  };

  try {
    const { taskId } = await api.servers.startExport(serverId);
    const task = await waitForTask(taskId, (t) => setProgress(t.progress));
    if (task.status !== TaskStatus.SUCCESS) {
      throw new Error(task.error?.message ?? labels.errorTitle);
    }

    lastPercent = 0;
    notifier.update(toastId, { message: labels.downloadingMessage, progress: 0 });
    const { blob, filename } = await api.servers.downloadExport(taskId, setProgress);
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
      progress: undefined,
      duration: 4000,
    });
  } catch (error: unknown) {
    notifier.update(toastId, {
      type: "error",
      title: labels.errorTitle,
      message: getApiErrorMessage(error),
      icon: TriangleAlert,
      progress: undefined,
      duration: 6000,
    });
  }
}
