"use client"

import { useId, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react"

import { cn } from "@/shared/lib/cn"
import { type Tone, toneClass } from "@/shared/ui/tone"

// Fixed drawing box, the SVG stretches to its container
const W = 300
const H = 100
const GRID_LINES = [25, 50, 75]

export interface AreaSeries {
  data: number[]
  tone: Tone
}

interface AreaChartProps {
  series: AreaSeries[]
  max?: number
  // Dashed guides at 25/50/75 percent of max
  grid?: boolean
  // Crosshair content for the hovered sample index
  renderTooltip?: (index: number) => ReactNode
  className?: string
}

const yOf = (value: number, max: number) => H - (Math.min(Math.max(value, 0), max) / max) * (H - 6) - 2

function points(data: number[], max: number) {
  const step = data.length > 1 ? W / (data.length - 1) : 0
  return data.map((value, i) => [i * step, yOf(value, max)] as const)
}

function Series({ data, tone, max, gradientId }: AreaSeries & { max: number; gradientId: string }) {
  if (data.length === 0) return null
  const pts = points(data, max)
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ")
  const [lastX, lastY] = pts[pts.length - 1]

  return (
    <g className={cn(toneClass[tone], "text-tone")}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity={0.28} />
          <stop offset="1" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${line} L${lastX} ${H} L0 ${H} Z`} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={lastX} cy={lastY} r={3} fill="currentColor" vectorEffect="non-scaling-stroke" />
    </g>
  )
}

function AreaChart({ series, max = 100, grid = false, renderTooltip, className }: AreaChartProps) {
  const id = useId()
  const [hover, setHover] = useState<{ index: number; x: number } | null>(null)
  const length = Math.max(0, ...series.map((s) => s.data.length))

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!renderTooltip || length < 2) return
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1)
    const index = Math.round(ratio * (length - 1))
    setHover({ index, x: (index / (length - 1)) * 100 })
  }

  return (
    <div
      data-slot="area-chart"
      className={cn("relative", className)}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHover(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
        {grid &&
          GRID_LINES.map((g) => (
            <line
              key={g}
              x1={0}
              x2={W}
              y1={yOf((g / 100) * max, max)}
              y2={yOf((g / 100) * max, max)}
              stroke="var(--border)"
              strokeDasharray="2 4"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        {series.map((s, i) => (
          <Series key={i} {...s} max={max} gradientId={`${id}-${i}`} />
        ))}
      </svg>
      {hover && renderTooltip && (
        <div className="contents" style={{ "--x": `${hover.x}%` } as CSSProperties}>
          <div className="pointer-events-none absolute inset-y-0 left-(--x) w-px bg-foreground/20" />
          <div className="pointer-events-none absolute top-0 left-[clamp(48px,var(--x),calc(100%-48px))] z-10 -translate-x-1/2 rounded-md border border-border bg-popover px-2 py-1 text-xs whitespace-nowrap shadow-pop">
            {renderTooltip(hover.index)}
          </div>
        </div>
      )}
    </div>
  )
}

/** Small trend line without guides or hover */
function Sparkline({ data, tone, max = 100, className }: AreaSeries & { max?: number; className?: string }) {
  return <AreaChart series={[{ data, tone }]} max={max} className={cn("h-[22px] w-full", className)} />
}

export { AreaChart, Sparkline }
