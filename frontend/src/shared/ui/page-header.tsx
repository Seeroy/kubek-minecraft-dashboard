import type * as React from "react"

import { cn } from "@/shared/lib/cn"

type PageHeaderProps = Omit<React.ComponentProps<"div">, "title"> & {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}

function PageHeader({ title, description, actions, className, ...props }: PageHeaderProps) {
  return (
    <div
      data-slot="page-header"
      className={cn("mb-5 flex flex-wrap items-center justify-between gap-4", className)}
      {...props}
    >
      <div className="min-w-0">
        <h1 className="text-[22px] leading-tight font-semibold tracking-[-0.015em]">{title}</h1>
        {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export { PageHeader }
