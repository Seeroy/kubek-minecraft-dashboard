import { cn } from "@/shared/lib/cn";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export type BlockHeaderColor =
  | "primary"
  | "green"
  | "blue"
  | "purple"
  | "red"
  | "orange"
  | "yellow";

interface ColorTokens {
  kicker: string;
  iconBg: string;
  iconText: string;
}

const COLORS: Record<BlockHeaderColor, ColorTokens> = {
  primary: {
    kicker: "bg-gradient-to-r from-primary via-primary/90 to-primary/60",
    iconBg: "bg-primary/10",
    iconText: "text-primary",
  },
  green: {
    kicker: "bg-gradient-to-r from-emerald-400 via-green-500 to-lime-400",
    iconBg: "bg-green-500/10",
    iconText: "text-green-400",
  },
  blue: {
    kicker: "bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400",
    iconBg: "bg-blue-500/10",
    iconText: "text-blue-500",
  },
  purple: {
    kicker: "bg-gradient-to-r from-fuchsia-400 via-purple-500 to-violet-400",
    iconBg: "bg-purple-500/10",
    iconText: "text-purple-400",
  },
  red: {
    kicker: "bg-gradient-to-r from-rose-400 via-red-500 to-orange-400",
    iconBg: "bg-red-500/10",
    iconText: "text-red-500",
  },
  orange: {
    kicker: "bg-gradient-to-r from-amber-400 via-orange-500 to-red-400",
    iconBg: "bg-orange-500/10",
    iconText: "text-orange-500",
  },
  yellow: {
    kicker: "bg-gradient-to-r from-yellow-300 via-yellow-500 to-amber-400",
    iconBg: "bg-yellow-500/10",
    iconText: "text-yellow-500",
  },
};

interface BlockHeaderProps {
  kicker: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  color?: BlockHeaderColor;
  /** Optional content rendered to the right of the title block (before the icon plate) */
  actions?: ReactNode;
  className?: string;
}

export const BlockHeader = ({
  kicker,
  title,
  description,
  icon: Icon,
  color = "primary",
  actions,
  className,
}: BlockHeaderProps) => {
  const c = COLORS[color];
  return (
    <div
      className={cn(
        "mb-2 flex items-center justify-between gap-2 md:mb-3 md:gap-3",
        className
      )}
    >
      <div className="min-w-0 flex-1 space-y-0.5 md:space-y-1">
        <span
          className={cn(
            "bg-clip-text text-xl font-bold text-transparent",
            c.kicker
          )}
        >
          {kicker}
        </span>
        {/* <h2 className="text-lg font-bold tracking-tight break-words md:text-2xl">
          {title}
        </h2> */}
        {description && (
          <p className="text-xs text-muted-foreground md:text-sm">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 self-center">{actions}</div>
      )}
      <div className={cn("flex-shrink-0 rounded-lg p-2 md:p-3", c.iconBg)}>
        <Icon className={cn("h-5 w-5 md:h-6 md:w-6", c.iconText)} />
      </div>
    </div>
  );
};

export default BlockHeader;
