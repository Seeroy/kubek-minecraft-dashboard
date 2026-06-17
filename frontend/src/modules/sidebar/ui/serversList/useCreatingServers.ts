"use client";
import { resolveProgressMessage } from "@/modules/notifications/utils/resolveProgressMessage";
import {
  creationOverallPercent,
  type CreationStatusView,
} from "@/modules/server/modals/CreateServerModal/stages";
import { useServerCreationStore } from "@/modules/server/store/server-creation.store";
import { useLanguageContext } from "@/shared/context/language-context";
import { TaskStatus, type ITask } from "@shared/types/task.types";
import { useMemo } from "react";

/**
 * Map server id to creation status
 */
export function useCreatingServers(): Map<string, CreationStatusView> {
  const { t: tGlobal } = useLanguageContext();
  const creations = useServerCreationStore((s) => s.creations);

  return useMemo(() => {
    const map = new Map<string, CreationStatusView>();
    for (const c of Object.values(creations)) {
      if (
        c.serverId &&
        (c.status === TaskStatus.PENDING || c.status === TaskStatus.RUNNING)
      ) {
        map.set(c.serverId, {
          progress: creationOverallPercent(c),
          message: resolveProgressMessage(
            { message: c.message, step: c.step } as ITask,
            tGlobal
          ),
        });
      }
    }
    return map;
  }, [creations, tGlobal]);
}
