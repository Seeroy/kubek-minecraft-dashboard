"use client";
import { cn } from "@/shared/lib/cn";
import { Plate } from "@/shared/ui/plate";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import type { CatalogEntry } from "../lib/catalog";

const sizes = {
  md: "size-[30px] rounded-md text-base",
  lg: "size-10 rounded-[10px] text-xl",
};

/** PNG from the catalog Pages, the emoji from the manifest, or the section icon */
export function CatalogIcon({ item, fallback: Fallback, size = "md" }: { item: Pick<CatalogEntry, "icon" | "iconText" | "source">; fallback: LucideIcon; size?: keyof typeof sizes }) {
  const [failed, setFailed] = useState(false);

  if (item.icon && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- remote icon, the static export has no image optimizer
      <img src={item.icon} alt="" loading="lazy" onError={() => setFailed(true)} className={cn("shrink-0 bg-subtle object-cover", sizes[size])} />
    );
  }
  if (item.iconText) {
    return (
      <span aria-hidden className={cn("grid shrink-0 place-items-center bg-subtle leading-none", sizes[size])}>
        {item.iconText}
      </span>
    );
  }
  return (
    <Plate tone={item.source === "official" ? "primary" : "orange"} size={size === "lg" ? "xl" : "md"} aria-hidden className={size === "lg" ? "size-10" : undefined}>
      <Fallback />
    </Plate>
  );
}
