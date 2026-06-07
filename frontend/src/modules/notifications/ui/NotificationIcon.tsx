"use client";
import { cn } from "@/shared/lib/cn";
import {
  AlertTriangle,
  Check,
  Info,
  LoaderCircle,
  LucideIcon,
  X,
} from "lucide-react";
import Image from "next/image";

const bgMap: Record<string, string> = {
  info: "bg-blue-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  progress: "bg-slate-500",
};

const defaultIconMap: Record<string, LucideIcon> = {
  info: Info,
  success: Check,
  warning: AlertTriangle,
  error: X,
  progress: LoaderCircle,
};

export default function NotificationIcon({
  icon,
  type,
}: {
  icon?: LucideIcon | string;
  type?: string;
}) {
  const t = type ?? "info";

  // Custom image icon - render inside a neutral circle
  if (typeof icon === "string") {
    return (
      <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-muted">
        <Image
          src={icon}
          alt=""
          width={36}
          height={36}
          className="size-full object-cover"
        />
      </div>
    );
  }

  const Icon = icon ?? defaultIconMap[t] ?? Info;
  const spin = t === "progress" && !icon;

  return (
    <div
      className={cn(
        "grid size-9 shrink-0 place-items-center rounded-full text-white shadow-sm",
        bgMap[t] ?? bgMap.info
      )}
    >
      <Icon
        size={18}
        strokeWidth={2.75}
        className={spin ? "animate-spin" : ""}
      />
    </div>
  );
}
