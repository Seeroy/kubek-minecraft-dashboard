"use client";
import { useTaskProgressMap } from "@/shared/hooks/useTaskProgressMap";
import { qk } from "@/shared/queries/query-keys";
import { TaskType } from "@shared/types/task.types";
import { useQueryClient } from "@tanstack/react-query";

/** Live install progress by Java version, the list refetches once an install settles */
export function useJavaTasks() {
  const queryClient = useQueryClient();
  return useTaskProgressMap(TaskType.JAVA_INSTALL, "javaVersion", {
    value: (task) => Math.round(task.progress ?? 0),
    onTask: (_task, { active }) => {
      if (!active) void queryClient.invalidateQueries({ queryKey: qk.java.all });
    },
  });
}
