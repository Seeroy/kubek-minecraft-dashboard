import { cva, type VariantProps } from "class-variance-authority"
import type * as React from "react"

import { cn } from "@/shared/lib/cn"
import { type Tone, toneClass } from "@/shared/ui/tone"

const plateVariants = cva(
  "grid shrink-0 place-items-center bg-tone/14 text-tone [&_svg]:shrink-0",
  {
    variants: {
      size: {
        sm: "size-[26px] rounded-[7px] [&_svg:not([class*='size-'])]:size-3.5",
        md: "size-[30px] rounded-md [&_svg:not([class*='size-'])]:size-4",
        lg: "size-9 rounded-[10px] [&_svg:not([class*='size-'])]:size-[18px]",
        xl: "size-11 rounded-[10px] [&_svg:not([class*='size-'])]:size-5",
      },
    },
    defaultVariants: { size: "md" },
  }
)

function Plate({
  tone = "primary",
  size,
  className,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof plateVariants> & { tone?: Tone }) {
  return (
    <span
      data-slot="plate"
      className={cn(toneClass[tone], plateVariants({ size }), className)}
      {...props}
    />
  )
}

export { Plate, plateVariants }
