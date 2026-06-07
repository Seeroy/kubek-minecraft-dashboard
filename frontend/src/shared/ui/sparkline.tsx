"use client";
import { cn } from "@/shared/lib/cn";
import { memo, useMemo } from "react";

interface SparklineProps {
  data: Array<{ usage: number }>;
  stroke: string;
  strokeWidth?: number;
  fill?: string;
  className?: string;
  min?: number;
  max?: number;
}

const VIEWBOX_W = 300;
const VIEWBOX_H = 100;
const PAD_Y = 4;

export const Sparkline = memo(function Sparkline({
  data,
  stroke,
  strokeWidth = 2,
  fill,
  className,
  min = 0,
  max = 100,
}: SparklineProps) {
  const { line, area } = useMemo(() => {
    if (!data.length) return { line: "", area: "" };

    const range = max - min || 1;
    const usableH = VIEWBOX_H - PAD_Y * 2;
    const stepX = data.length > 1 ? VIEWBOX_W / (data.length - 1) : 0;

    const points = data.map((d, i) => {
      const x = i * stepX;
      const y = PAD_Y + usableH - ((d.usage - min) / range) * usableH;
      return [x, y] as const;
    });

    const line = points
      .map(
        ([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
      )
      .join(" ");

    const last = points[points.length - 1];
    const first = points[0];
    const area = `${line} L${last[0].toFixed(1)},${VIEWBOX_H} L${first[0].toFixed(1)},${VIEWBOX_H} Z`;

    return { line, area };
  }, [data, min, max]);

  if (!data.length) return null;

  return (
    <svg
      viewBox={`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`}
      preserveAspectRatio="none"
      className={cn("h-full w-full", className)}
      aria-hidden="true"
    >
      {fill && <path d={area} fill={fill} />}
      <path
        d={line}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
});
