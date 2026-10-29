import { cn } from "@/shared/lib/cn"
import * as React from "react"

const panelSurface =
  "min-w-0 rounded-lg border border-border bg-card text-card-foreground shadow-card"

function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      data-slot="panel"
      className={cn(panelSurface, "flex flex-col", className)}
      {...props}
    />
  )
}

function PanelHead({ className, ...props }: React.ComponentProps<"header">) {
  return (
    <header
      data-slot="panel-head"
      className={cn(
        "flex min-h-11 shrink-0 items-center gap-2 border-b border-border px-4",
        className
      )}
      {...props}
    />
  )
}

function PanelTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="panel-title"
      className={cn("text-[13px] font-semibold tracking-[0.005em]", className)}
      {...props}
    />
  )
}

function PanelMeta({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="panel-meta"
      className={cn("text-xs text-muted-foreground tabular-nums", className)}
      {...props}
    />
  )
}

function PanelActions({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="panel-actions"
      className={cn("ml-auto flex items-center gap-1", className)}
      {...props}
    />
  )
}

function PanelBody({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="panel-body" className={cn("p-4", className)} {...props} />
}

function PanelFoot({ className, ...props }: React.ComponentProps<"footer">) {
  return (
    <footer
      data-slot="panel-foot"
      className={cn(
        "flex items-center gap-2 border-t border-border px-4 py-2 text-xs text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Panel, PanelActions, PanelBody, PanelFoot, PanelHead, PanelMeta, panelSurface, PanelTitle }
