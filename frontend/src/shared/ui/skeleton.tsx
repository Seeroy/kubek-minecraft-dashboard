import { cn } from "@/shared/lib/cn"
import * as React from "react"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("skeleton-shimmer rounded-sm", className)} {...props} />
}

export { Skeleton }
