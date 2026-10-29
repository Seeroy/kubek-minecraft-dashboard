"use client"

import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/cn"

const toggleVariants = cva(
  "group/toggle inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-md text-[13px] font-medium whitespace-nowrap transition-colors outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary/70 disabled:pointer-events-none disabled:opacity-45 data-pressed:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent text-muted-foreground hover:bg-hover data-pressed:bg-hover",
        outline:
          "border border-border bg-card text-muted-foreground hover:bg-hover data-pressed:bg-hover",
        // Pill inside a segmented control, see ToggleGroup variant="segmented"
        segmented:
          "rounded-sm text-[12.5px] text-muted-foreground data-pressed:bg-segment-active data-pressed:shadow-sm [&_svg:not([class*='size-'])]:size-3.5",
      },
      size: {
        default: "h-ctl min-w-ctl px-3",
        sm: "h-7 min-w-7 px-2.5",
        lg: "h-10 min-w-10 px-4",
      },
    },
    compoundVariants: [{ variant: "segmented", className: "h-full min-w-0 px-3" }],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: TogglePrimitive.Props & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Toggle, toggleVariants }
