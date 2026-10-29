"use client"

import { Meter as MeterPrimitive } from "@base-ui/react/meter"

import { cn } from "@/shared/lib/cn"
import { type Tone, toneClass } from "@/shared/ui/tone"

type MeterProps = Omit<MeterPrimitive.Root.Props, "children"> & {
  tone?: Tone
  size?: "sm" | "md"
  // Switch to warn above 75% and danger above 90%
  thresholds?: boolean
}

function levelOf(value: number, min: number, max: number) {
  const pct = ((value - min) / (max - min || 1)) * 100
  if (pct > 90) return "crit"
  if (pct > 75) return "high"
  return "normal"
}

function Meter({
  value,
  min = 0,
  max = 100,
  tone,
  size = "sm",
  thresholds = false,
  className,
  ...props
}: MeterProps) {
  const level = thresholds ? levelOf(value, min, max) : "normal"
  return (
    <MeterPrimitive.Root
      data-slot="meter"
      data-level={level}
      data-size={size}
      value={value}
      min={min}
      max={max}
      className={cn("group/meter min-w-0", tone ? toneClass[tone] : "[--c:var(--foreground)]", className)}
      {...props}
    >
      <MeterPrimitive.Track className="h-1 overflow-hidden rounded-full bg-tone/14 group-data-[size=md]/meter:h-1.5">
        <MeterPrimitive.Indicator className="h-full rounded-full bg-tone opacity-85 transition-[width,background-color] duration-700 ease-smooth group-data-[level=high]/meter:bg-warn group-data-[level=high]/meter:opacity-100 group-data-[level=crit]/meter:bg-danger group-data-[level=crit]/meter:opacity-100" />
      </MeterPrimitive.Track>
    </MeterPrimitive.Root>
  )
}

export { Meter }
