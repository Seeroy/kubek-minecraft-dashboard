"use client"

import Image from "next/image"
import { memo, useState } from "react"

import { API_URL } from "@/shared/lib/http/api-url"
import { cn } from "@/shared/lib/cn"

const MINECRAFT_NAME = /^[A-Za-z0-9_]{1,16}$/

// Names the backend has no skin for, shared so other instances skip the request
const missingHeads = new Set<string>()

type PlayerHeadProps = {
  name: string
  size?: number
  className?: string
}

function PlayerHeadInner({ name, size = 24, className }: PlayerHeadProps) {
  const key = name.toLowerCase()
  const [failedKey, setFailedKey] = useState<string | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const canLoad = MINECRAFT_NAME.test(name) && !missingHeads.has(key) && failedKey !== key

  const classes = cn(
    "block shrink-0 overflow-hidden rounded-[4px] [image-rendering:pixelated]",
    className
  )

  if (!canLoad) {
    return <GeneratedHead name={name} size={size} className={classes} />
  }

  return (
    <Image
      src={`${API_URL}/heads/${encodeURIComponent(name)}`}
      alt=""
      title={name}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      unoptimized
      draggable={false}
      onLoad={() => setLoadedKey(key)}
      onError={() => {
        missingHeads.add(key)
        setFailedKey(key)
      }}
      // Shimmer until the skin arrives, then fade the head in
      className={cn(classes, loadedKey === key ? "animate-in duration-300 fade-in" : "skeleton-shimmer")}
    />
  )
}

const SKIN = ["#c98f62", "#e3b08a", "#8a5a3c", "#f0c9a4", "#b07850"]
const HAIR = ["#3a2618", "#6b4423", "#d9b54a", "#1d1d22", "#8c2f22", "#cfcfcf", "#4a3a8c"]
const EYE = ["#3b5bdb", "#2f7d4f", "#6b3e1f", "#444"]
const SHADE = "rgba(0,0,0,.18)"

type Pixel = [x: number, y: number, w: number, h: number, fill: string]

const facesCache = new Map<string, Pixel[]>()

const hashName = (name: string) =>
  [...name].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)

// Deterministic 8x8 face so every name gets the same stand-in head
function generatedFace(name: string): Pixel[] {
  const cached = facesCache.get(name)
  if (cached) return cached

  const h = hashName(name)
  const pick = <T,>(list: T[], shift: number) => list[(h >> shift) % list.length]
  const skin = pick(SKIN, 1)
  const hair = pick(HAIR, 4)
  const eye = pick(EYE, 8)
  const fringe = (h >> 11) % 3
  const mouth = (h >> 13) % 2 ? "#7a3f2a" : SHADE

  const pixels: Pixel[] = [
    [0, 0, 8, 8, skin],
    [0, 0, 8, fringe === 2 ? 3 : 2, hair],
    [1, 4, 2, 1, "#fff"],
    [5, 4, 2, 1, "#fff"],
    [2, 4, 1, 1, eye],
    [5, 4, 1, 1, eye],
    [3, 5, 2, 1, SHADE],
    [2, 6, 4, 1, mouth],
  ]
  if (fringe === 1) pixels.splice(2, 0, [0, 2, 1, 2, hair], [7, 2, 1, 2, hair])

  facesCache.set(name, pixels)
  return pixels
}

function GeneratedHead({ name, size, className }: Required<Omit<PlayerHeadProps, "className">> & { className: string }) {
  return (
    <svg
      viewBox="0 0 8 8"
      width={size}
      height={size}
      shapeRendering="crispEdges"
      role="img"
      aria-label={name}
      className={className}
    >
      {generatedFace(name).map(([x, y, w, h, fill], i) => (
        <rect key={i} x={x} y={y} width={w} height={h} fill={fill} />
      ))}
    </svg>
  )
}

const PlayerHead = memo(PlayerHeadInner)

export { PlayerHead }
