import { cn } from "@/shared/lib/cn";
import LogoMark from "@/shared/ui/logo-mark";
import React from "react";

type LogoSize = "sm" | "md" | "lg" | "xl";

const sizeMap: Record<
  LogoSize,
  { image: number; text: string; offset: string }
> = {
  sm: { image: 22, text: "text-lg", offset: "-mb-[4px]" },
  md: { image: 28, text: "text-2xl", offset: "" },
  lg: { image: 38, text: "text-3xl", offset: "" },
  xl: { image: 52, text: "text-5xl", offset: "" },
};

type LogoV2Props = {
  size?: LogoSize;
  withText?: boolean;
  className?: string;
};

const LogoV2: React.FC<LogoV2Props> = ({
  size = "md",
  withText = true,
  className,
}) => {
  const { image, text, offset } = sizeMap[size];

  return (
    <div className={cn("flex items-end select-none", className)}>
      {/* Icon stands in for the letter "K"; colors follow the theme */}
      <LogoMark size={image} />
      {withText && (
        <span
          className={cn(
            "skew-x-[7deg] leading-none font-extrabold tracking-tight lowercase",
            text,
            offset
          )}
        >
          ubek
        </span>
      )}
    </div>
  );
};

export default LogoV2;
