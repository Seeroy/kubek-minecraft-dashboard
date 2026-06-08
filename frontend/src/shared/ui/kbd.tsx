import { cn } from "@/shared/lib/cn";
import * as React from "react";

/** Small keycap badge for surfacing keyboard shortcuts in the UI */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-sm border border-border/60 bg-muted px-1.5 font-sans text-[10px] font-medium text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Kbd };
