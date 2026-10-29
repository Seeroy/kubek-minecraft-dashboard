import * as React from "react"

import { cn } from "@/shared/lib/cn"
import { fieldBase } from "@/shared/ui/styles"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        fieldBase,
        "flex field-sizing-content min-h-16 resize-y px-3 py-2 leading-[1.55]",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
