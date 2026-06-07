import { cn } from "@/shared/lib/cn";
import type { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  className?: string;
}

export function PageLayout({ children, className }: PageLayoutProps) {
  return (
    <div
      className={cn(
        "animate-in space-y-6 duration-500 fade-in slide-in-from-bottom-4",
        className
      )}
    >
      {children}
    </div>
  );
}
