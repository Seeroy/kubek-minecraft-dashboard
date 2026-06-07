"use client";
import { usePlatformModifier } from "@/shared/hooks/usePlatformModifier";
import { useTranslation } from "@/shared/hooks/useTranslation";
import { cn } from "@/shared/lib/cn";
import { Kbd } from "@/shared/ui/kbd";
import { Search } from "lucide-react";
import { useCommandPalette } from "../hooks/useCommandPalette";

interface CommandPaletteTriggerProps {
  /** "bar" — full search-style row; "icon" — compact icon button for the header */
  variant?: "bar" | "icon";
  className?: string;
}

/** Surfaces the otherwise hidden Cmd/Ctrl+K palette from the sidebar */
export function CommandPaletteTrigger({
  variant = "bar",
  className,
}: CommandPaletteTriggerProps) {
  const open = useCommandPalette((s) => s.setOpen);
  const { mod } = usePlatformModifier();
  const { t } = useTranslation("modules.commandPalette");

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={() => open(true)}
        aria-label={t("trigger")}
        title={t("trigger")}
        className={cn(
          "flex h-10 items-center gap-1.5 rounded-lg border border-border/40 bg-card px-2.5 text-muted-foreground transition-colors hover:border-border hover:text-foreground",
          className
        )}
      >
        <Search className="h-4 w-4 shrink-0" />
        <Kbd>{mod} + K</Kbd>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => open(true)}
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-lg border border-border/40 bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-border hover:text-foreground",
        className
      )}
    >
      <Search className="h-4 w-4 shrink-0" />
      <span className="flex-1 text-left">{t("trigger")}</span>
      <span className="flex shrink-0 items-center gap-0.5">
        <Kbd>{mod} + K</Kbd>
      </span>
    </button>
  );
}
