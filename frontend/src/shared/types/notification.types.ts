import { LucideIcon } from "lucide-react";

export type NotificationType =
  | "info"
  | "success"
  | "warning"
  | "error"
  | "progress";

export interface NotificationAction {
  key?: string;
  label: string;
  onClick: () => void;
}

export interface Notification {
  id: string;
  title: string;
  message?: string;
  type?: NotificationType;
  icon?: LucideIcon | string;
  progress?: number;
  actions?: NotificationAction[];
  duration?: number;
  createdAt: number;
}
