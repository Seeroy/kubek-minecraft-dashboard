import { resolveProgressMessage } from "@/modules/notifications/utils/resolveProgressMessage";
import { useLanguageContext } from "@/shared/context/language-context";
import { TaskStatus, type ITask } from "@shared/types/task.types";
import { useServerCreationStore } from "../../store/server-creation.store";
import { computeCreationStages } from "./stages";

/**
 * Derives the progress-view state (stages, status flags, localized message) for
 * the in-flight creation identified by `activeTaskId`, and exposes clearCreation
 */
export function useServerCreationProgress(activeTaskId: string | null) {
  const { t } = useLanguageContext();
  const creation = useServerCreationStore((s) =>
    activeTaskId ? s.creations[activeTaskId] : undefined
  );
  const clearCreation = useServerCreationStore((s) => s.clear);

  const creationStages = creation ? computeCreationStages(creation) : [];
  const creationStatus = creation?.status;
  const isCreationSuccess = creationStatus === TaskStatus.SUCCESS;
  const isCreationFailed =
    creationStatus === TaskStatus.FAILED ||
    creationStatus === TaskStatus.CANCELLED;
  const creationMessage = creation
    ? resolveProgressMessage(
        { message: creation.message, step: creation.step } as ITask,
        t
      )
    : null;

  return {
    creation,
    creationStages,
    isCreationSuccess,
    isCreationFailed,
    creationMessage,
    clearCreation,
  };
}
