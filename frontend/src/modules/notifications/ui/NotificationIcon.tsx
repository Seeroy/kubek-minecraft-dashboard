"use client";
import type { NotificationType } from "@/shared/types/toast.types";
import { AlertTriangle, Check, Info, LoaderCircle, type LucideIcon, X } from "lucide-react";
import Image from "next/image";

const iconByType: Record<NotificationType, LucideIcon> = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
  error: X,
  progress: LoaderCircle,
};

export default function NotificationIcon({ icon, type = "info" }: { icon?: LucideIcon | string; type?: NotificationType }) {
  if (typeof icon === "string") {
    return <Image src={icon} alt="" width={32} height={32} className="relative size-8 shrink-0 rounded-full object-cover" />;
  }

  const Icon = icon ?? iconByType[type];
  return (
    <span className="relative grid size-8 shrink-0 place-items-center rounded-full bg-tone/16 text-tone">
      <Icon data-spin={(type === "progress" && !icon) || undefined} className="size-4 stroke-[2.5] data-spin:animate-spin" />
    </span>
  );
}
