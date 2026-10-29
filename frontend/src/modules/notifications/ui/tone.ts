import type { NotificationType } from "@/shared/types/toast.types";
import { toneClass } from "@/shared/ui/tone";

export const notificationTone: Record<NotificationType, string> = {
  info: toneClass.primary,
  success: toneClass.green,
  warning: toneClass.amber,
  error: toneClass.red,
  progress: toneClass.gray,
};
