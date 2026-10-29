import type * as React from "react"

import { cn } from "@/shared/lib/cn"
import { Panel } from "@/shared/ui/panel"
import { Plate } from "@/shared/ui/plate"
import type { Tone } from "@/shared/ui/tone"

// Cells sit on a 1px gap over the border color, so dividers follow any wrap
function StatStrip({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <Panel
      data-slot="stat-strip"
      className={cn(
        "grid grid-cols-1 gap-px overflow-hidden bg-border sm:grid-cols-2 lg:grid-flow-col lg:auto-cols-fr lg:grid-cols-none",
        className
      )}
      {...props}
    />
  )
}

type StatProps = Omit<React.ComponentProps<"div">, "title"> & {
  label: React.ReactNode
  icon?: React.ReactNode
  tone?: Tone
  value: React.ReactNode
  unit?: React.ReactNode
}

function Stat({ label, icon, tone, value, unit, children, className, ...props }: StatProps) {
  return (
    <div data-slot="stat" className={cn("min-w-0 bg-card p-4", className)} {...props}>
      <div className="flex items-center justify-between gap-2 text-[12.5px] text-muted-foreground">
        {label}
        {icon && (
          <Plate tone={tone} size="sm">
            {icon}
          </Plate>
        )}
      </div>
      <div data-slot="stat-value" className="mt-1 text-[26px] leading-[1.15] font-semibold tracking-[-0.02em] tabular-nums">
        {value}
        {unit && (
          <small className="text-sm font-medium tracking-normal text-muted-foreground">{unit}</small>
        )}
      </div>
      {children && (
        <div className="mt-2 flex min-h-[22px] items-center gap-1.5 text-xs text-muted-foreground">
          {children}
        </div>
      )}
    </div>
  )
}

export { Stat, StatStrip }
