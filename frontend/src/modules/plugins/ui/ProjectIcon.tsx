"use client";
import { cn } from "@/shared/lib/cn";
import { Plate } from "@/shared/ui/plate";
import { useState } from "react";
import { categoryTone } from "../lib/categories";

const imageSize = {
  sm: "size-[26px] rounded-[7px]",
  md: "size-[30px] rounded-md",
  lg: "size-9 rounded-[10px]",
};

const initials = (title: string) => title.replace(/[^\p{L}\p{N}]/gu, "").slice(0, 2);

/** Modrinth icon, or tinted initials when the project has none or it fails to load */
export function ProjectIcon({
  title,
  iconUrl,
  category,
  size = "md",
}: {
  title: string;
  iconUrl?: string;
  category?: string;
  size?: keyof typeof imageSize;
}) {
  const [failed, setFailed] = useState(false);

  if (iconUrl && !failed) {
    return (
      // Remote Modrinth CDN icons, the static export has no image optimizer
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={iconUrl}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn("shrink-0 bg-subtle object-cover", imageSize[size])}
      />
    );
  }
  return (
    <Plate tone={categoryTone(category)} size={size} aria-hidden className={cn("font-bold uppercase", size === "lg" ? "text-[13px]" : "text-[10.5px]")}>
      {initials(title)}
    </Plate>
  );
}
