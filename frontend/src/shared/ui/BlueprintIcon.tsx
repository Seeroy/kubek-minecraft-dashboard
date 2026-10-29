"use client";

import { cn } from "@/shared/lib/cn";
import { Upload } from "lucide-react";
import { useMemo, useState } from "react";

interface BlueprintIconProps {
  icon?: string;
  coreType?: string;
  label: string;
  className?: string;
}

const isImageSrc = (value?: string) =>
  !!value &&
  (value.startsWith("data:") ||
    value.startsWith("http") ||
    value.startsWith("/"));

/**
 * Renders a blueprint icon, trying image sources in order
 */
export function BlueprintIcon({
  icon,
  coreType,
  label,
  className,
}: BlueprintIconProps) {
  const sources = useMemo(() => {
    const list: string[] = [];
    if (isImageSrc(icon)) list.push(icon!);
    if (coreType) list.push(`/images/cores/${coreType}.webp`);
    return list;
  }, [icon, coreType]);

  const emoji = isImageSrc(icon) || !icon ? "📦" : icon;
  const [index, setIndex] = useState(0);

  // Custom jar has no logo, an upload tile reads better than a placeholder
  if (coreType === "custom" && !isImageSrc(icon)) {
    return (
      <span
        role="img"
        aria-label={label}
        className={cn(
          "inline-flex shrink-0 items-center justify-center bg-secondary text-muted-foreground",
          className,
        )}
      >
        <Upload className="size-[45%]" />
      </span>
    );
  }

  if (index >= sources.length) {
    return (
      <span
        className={cn("inline-flex items-center justify-center", className)}
      >
        {emoji}
      </span>
    );
  }

  return (
    <img
      src={sources[index]}
      alt={label}
      className={cn("object-contain", className)}
      onError={() => setIndex((i) => i + 1)}
    />
  );
}
