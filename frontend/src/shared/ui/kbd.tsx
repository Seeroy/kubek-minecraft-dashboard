import { cn } from "@/shared/lib/cn";
import * as React from "react";

/** Small keycap badge for surfacing keyboard shortcuts in the UI */
function Kbd({ className, ...props }: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-[4px] border border-b-2 border-border bg-subtle px-1 font-mono text-[11px] text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export { Kbd };
