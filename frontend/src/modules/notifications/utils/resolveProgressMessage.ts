import { type ITask, TaskSteps } from "@shared/types/task.types";

/**
 * Maps a task's current step to a localized progress message. A known step
 * always wins over task.message
 * Raw message is only a fallback for steps we
 * don't recognize, and finally a generic default
 */
export function resolveProgressMessage(
  task: ITask,
  t: (key: string) => string
): string {
  switch (task.step) {
    case TaskSteps.SEARCHING_CORE:
      return t("modules.notifications.tasks.steps.searchingCore");
    case TaskSteps.DOWNLOADING_CORE:
      return t("modules.notifications.tasks.steps.downloadingCore");
    case TaskSteps.CHECKING_JAVA:
      return t("modules.notifications.tasks.steps.checkingJava");
    case TaskSteps.DOWNLOADING_JAVA:
      return t("modules.notifications.tasks.steps.downloadingJava");
    case TaskSteps.UNPACKING_JAVA:
      return t("modules.notifications.tasks.steps.unpackingJava");
    case TaskSteps.CREATING_BAT:
      return t("modules.notifications.tasks.steps.creatingBat");
    case TaskSteps.COMPLETED:
      return t("modules.notifications.tasks.steps.completed");
  }
  if (task.message) return task.message;
  return t("modules.notifications.tasks.defaultProgress");
}
