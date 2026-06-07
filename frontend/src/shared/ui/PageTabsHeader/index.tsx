import type { ReactNode } from "react";

interface PageTabsHeaderProps {
  tabs: ReactNode;
  actions?: ReactNode;
}

export function PageTabsHeader({ tabs, actions }: PageTabsHeaderProps) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="-mx-6 overflow-x-auto px-6 md:mx-0 md:px-0">{tabs}</div>
      {actions && (
        <div className="flex flex-shrink-0 items-center gap-2">{actions}</div>
      )}
    </div>
  );
}
