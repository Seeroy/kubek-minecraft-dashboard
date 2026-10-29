import { Input as InputPrimitive } from "@base-ui/react/input"
import * as React from "react"

import { cn } from "@/shared/lib/cn"
import { fieldBase } from "@/shared/ui/styles"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        fieldBase,
        "h-ctl px-3 file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[13px] file:font-medium file:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Input }
