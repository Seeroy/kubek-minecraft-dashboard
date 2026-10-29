import { mergeProps } from "@base-ui/react/merge-props"
import { useRender } from "@base-ui/react/use-render"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/shared/lib/cn"

const badgeVariants = cva(
  "group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-[5px] border border-transparent px-1.5 text-[11.5px] font-medium whitespace-nowrap transition-colors [&>svg]:pointer-events-none [&>svg]:size-3!",
  {
    variants: {
      variant: {
        default: "bg-primary/14 text-primary [a]:hover:bg-primary/20",
        secondary: "bg-secondary text-muted-foreground [a]:hover:text-foreground",
        destructive: "bg-danger/14 text-danger",
        success: "bg-success/14 text-success",
        warning:
          "bg-warn/16 text-[color-mix(in_oklch,var(--warn),var(--foreground)_25%)]",
        info: "bg-primary/14 text-primary",
        outline: "border-border text-foreground [a]:hover:bg-hover",
        ghost: "text-muted-foreground hover:bg-hover",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  })
}

export { Badge, badgeVariants }
