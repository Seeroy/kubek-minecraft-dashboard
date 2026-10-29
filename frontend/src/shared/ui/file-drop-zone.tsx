"use client"

import type * as React from "react"
import { useRef, useState } from "react"

import { cn } from "@/shared/lib/cn"
import { Button } from "@/shared/ui/button"
import { Plate } from "@/shared/ui/plate"
import { Spinner } from "@/shared/ui/spinner"
import type { Tone } from "@/shared/ui/tone"
import { Upload } from "lucide-react"

interface FileDropZoneProps {
  icon: React.ReactNode
  tone: Tone
  title: React.ReactNode
  hint: React.ReactNode
  accept: string
  buttonLabel: React.ReactNode
  busyLabel: React.ReactNode
  busy: boolean
  onFile: (file: File) => void
}

/** Dashed drop target with a picker button, for single package uploads */
function FileDropZone({ icon, tone, title, hint, accept, buttonLabel, busyLabel, busy, onFile }: FileDropZoneProps) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  return (
    <div
      data-slot="file-drop-zone"
      onDragOver={(event) => {
        event.preventDefault()
        setOver(true)
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault()
        setOver(false)
        const file = event.dataTransfer.files[0]
        if (file && !busy) onFile(file)
      }}
      className={cn(
        "flex flex-wrap items-center gap-4 rounded-lg border-[1.5px] border-dashed border-border px-5 py-4 transition-colors max-sm:gap-3 max-sm:px-4",
        over && "border-primary/60 bg-primary/6"
      )}
    >
      <Plate tone={tone} size="lg">
        {icon}
      </Plate>
      <div className="min-w-0 flex-1">
        <b className="block text-[13.5px] font-semibold">{title}</b>
        <span className="text-[12.5px] text-muted-foreground">{hint}</span>
      </div>
      <input
        ref={input}
        type="file"
        accept={accept}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          // Cleared so picking the same file again still fires change
          event.target.value = ""
          if (file) onFile(file)
        }}
      />
      {/* Own full width row on phones so the text has room */}
      <Button disabled={busy} className="max-sm:w-full" onClick={() => input.current?.click()}>
        {busy ? <Spinner /> : <Upload />}
        {busy ? busyLabel : buttonLabel}
      </Button>
    </div>
  )
}

export { FileDropZone }
