import type * as React from "react"

import { cn } from "@/shared/lib/cn"

function KeyValue({ className, ...props }: React.ComponentProps<"dl">) {
  return (
    <dl
      data-slot="key-value"
      className={cn("m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px]", className)}
      {...props}
    />
  )
}

function KeyValueItem({
  label,
  children,
}: {
  label: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="m-0 min-w-0 truncate text-right font-medium">{children}</dd>
    </>
  )
}

export { KeyValue, KeyValueItem }
