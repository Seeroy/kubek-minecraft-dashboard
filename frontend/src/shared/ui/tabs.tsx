"use client"

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { useScrollEdges } from "@/shared/hooks/useScrollEdges"
import { cn } from "@/shared/lib/cn"
import { ChevronLeft, ChevronRight } from "lucide-react"
import * as React from "react"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-4 data-[orientation=horizontal]:flex-col",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "group/tabs-list scrollbar-hide inline-flex max-w-full w-fit items-center overflow-x-auto text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col group-data-[orientation=vertical]/tabs:items-stretch",
  {
    variants: {
      variant: {
        default:
          "gap-0.5 rounded-lg border border-border bg-segment p-1",
        line: "gap-1 border-b border-border",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  children,
  ref,
  ...props
}: TabsPrimitive.List.Props & VariantProps<typeof tabsListVariants>) {
  const [node, setNode] = React.useState<HTMLDivElement | null>(null)
  const edges = useScrollEdges(node)
  const setRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      setNode(el)
      if (typeof ref === "function") ref(el)
      else if (ref) ref.current = el
    },
    [ref]
  )

  return (
    <TabsPrimitive.List
      ref={setRef}
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {/* Only when the row overflows, tabs that fit stay as they were */}
      {edges.overflow && <TabsScrollHint side="start" el={node} visible={edges.start} />}
      {children}
      {edges.overflow && <TabsScrollHint side="end" el={node} visible={edges.end} />}
    </TabsPrimitive.List>
  )
}

// Segment tint over the page color, matches the see-through dark segment
const scrollHintSides = {
  start: {
    icon: ChevronLeft,
    anchor: "left-0",
    fade: "-left-1 justify-start pl-1.5 bg-[linear-gradient(to_right,var(--background)_45%,transparent)] group-data-[variant=default]/tabs-list:bg-[linear-gradient(to_right,var(--segment)_45%,transparent),linear-gradient(to_right,var(--background)_45%,transparent)]",
  },
  end: {
    icon: ChevronRight,
    anchor: "right-0",
    fade: "-right-1 justify-end pr-1.5 bg-[linear-gradient(to_left,var(--background)_45%,transparent)] group-data-[variant=default]/tabs-list:bg-[linear-gradient(to_left,var(--segment)_45%,transparent),linear-gradient(to_left,var(--background)_45%,transparent)]",
  },
} as const

// Zero width sticky anchor, the fade hangs off it
function TabsScrollHint({ side, el, visible }: { side: "start" | "end"; el: HTMLElement | null; visible: boolean }) {
  const { icon: Icon, anchor, fade } = scrollHintSides[side]

  const scroll = () => {
    if (!el) return
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const step = Math.max(el.clientWidth * 0.6, 80)
    el.scrollBy({ left: side === "start" ? -step : step, behavior: reduce ? "auto" : "smooth" })
  }

  return (
    <span
      aria-hidden
      data-slot="tabs-scroll-hint"
      data-visible={visible}
      className={cn("group/hint sticky z-1 w-0 shrink-0 self-stretch", anchor)}
    >
      <span
        // Keep focus on the tabs, the arrow only scrolls
        onPointerDown={(event) => event.preventDefault()}
        onClick={scroll}
        className={cn(
          "absolute -inset-y-1 flex w-10 cursor-pointer items-center text-muted-foreground transition-opacity duration-150 ease-smooth hover:text-foreground group-data-[visible=false]/hint:pointer-events-none group-data-[visible=false]/hint:opacity-0 [&_svg]:size-4",
          fade
        )}
      >
        <Icon />
      </span>
    </span>
  )
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex h-[34px] shrink-0 cursor-pointer items-center justify-center gap-2 px-3.5 text-[13.5px] font-medium whitespace-nowrap transition-[color,background-color,box-shadow] duration-150 outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary/70 disabled:pointer-events-none disabled:opacity-45 data-active:text-foreground group-data-[orientation=vertical]/tabs:justify-start [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 data-active:[&_svg]:text-primary",
        "group-data-[variant=default]/tabs-list:rounded-[9px] group-data-[variant=default]/tabs-list:data-active:bg-segment-active group-data-[variant=default]/tabs-list:data-active:shadow-segment",
        "group-data-[variant=line]/tabs-list:-mb-px group-data-[variant=line]/tabs-list:border-b-2 group-data-[variant=line]/tabs-list:border-transparent group-data-[variant=line]/tabs-list:px-2 group-data-[variant=line]/tabs-list:data-active:border-primary",
        className
      )}
      {...props}
    />
  )
}

function TabsCount({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="tabs-count"
      className={cn(
        "inline-grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[11px] leading-none text-primary-foreground tabular-nums empty:hidden",
        className
      )}
      {...props}
    />
  )
}

function TabsSeparator({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      aria-hidden
      data-slot="tabs-separator"
      className={cn("mx-1.5 h-[18px] w-px shrink-0 bg-border", className)}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("min-w-0 flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsContent, TabsCount, TabsList, tabsListVariants, TabsSeparator, TabsTrigger }
