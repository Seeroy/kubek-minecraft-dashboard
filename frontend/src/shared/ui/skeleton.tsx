import { cn } from "@/shared/lib/cn";
import React from "react";

const Skeleton = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ ref }
      className={ cn("animate-pulse rounded-md bg-muted/60", className) }
      { ...props }
    />
  )
);
Skeleton.displayName = "Skeleton";

export { Skeleton };
