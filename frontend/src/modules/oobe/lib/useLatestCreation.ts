import { creationOverallPercent } from "@/modules/server/modals/CreateServerModal/stages";
import { useServerCreationStore } from "@/modules/server/store/server-creation.store";
import { TaskStatus } from "@shared/types/task.types";

// The server started from the OOBE wizard, the newest creation in the session
export function useLatestCreation() {
  const creation = useServerCreationStore((s) => {
    let latest: (typeof s.creations)[string] | undefined;
    for (const item of Object.values(s.creations)) if (!latest || item.updatedAt > latest.updatedAt) latest = item;
    return latest;
  });
  if (!creation) return undefined;
  return {
    ...creation,
    percent: creationOverallPercent(creation),
    done: creation.status === TaskStatus.SUCCESS,
    failed: creation.status === TaskStatus.FAILED || creation.status === TaskStatus.CANCELLED,
  };
}

export type LatestCreation = NonNullable<ReturnType<typeof useLatestCreation>>;
