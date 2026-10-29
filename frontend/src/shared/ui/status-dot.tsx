import { ServerStatus } from "@shared/types/server/server.types"
import type * as React from "react"

import { cn } from "@/shared/lib/cn"

const statusColor: Record<ServerStatus, string> = {
  [ServerStatus.RUNNING]: "bg-success",
  [ServerStatus.STOPPED]: "bg-muted-foreground/60",
  [ServerStatus.STARTING]: "bg-warn animate-blink",
  [ServerStatus.STOPPING]: "bg-c-orange animate-blink",
  [ServerStatus.CRASHED]: "bg-danger",
}

function StatusDot({
  status,
  className,
  ...props
}: React.ComponentProps<"span"> & { status: ServerStatus }) {
  return (
    <span
      data-slot="status-dot"
      data-status={status}
      className={cn("relative size-2 shrink-0 rounded-full", statusColor[status], className)}
      {...props}
    />
  )
}

export { StatusDot }
