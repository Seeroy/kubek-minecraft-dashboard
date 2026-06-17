"use client";
import { cn } from "@/shared/lib/cn";
import React from "react";

interface Props {
  color?: string | null;
  className?: string;
}

const FolderColorDot: React.FC<Props> = ({ color, className }) => (
  <span
    className={cn(
      "inline-block h-3 w-3 shrink-0 rounded-full border border-border/60",
      !color && "bg-muted-foreground/40",
      className
    )}
    style={color ? { backgroundColor: color } : undefined}
  />
);

export default FolderColorDot;
