import { cn } from "@/shared/lib/cn";
import { buttonVariants } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip";
import type { VariantProps } from "class-variance-authority";
import * as React from "react";

type TooltipWrapperProps = React.ComponentProps<typeof Tooltip>;
type TooltipContentProps = React.ComponentProps<typeof TooltipContent>;

export interface TooltipButtonProps
  extends
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "type">,
    VariantProps<typeof buttonVariants> {
  tooltipContent: React.ReactNode;
  tooltipProps?: Partial<TooltipWrapperProps>;
  tooltipContentProps?: Partial<TooltipContentProps>;
  tooltipClassName?: string;
}

export const TooltipButton: React.FC<TooltipButtonProps> = (props) => {
  const {
    tooltipContent,
    tooltipProps,
    tooltipContentProps,
    tooltipClassName,
    className,
    children,
    variant,
    size,
    ...buttonProps
  } = props;

  return (
    <Tooltip {...(tooltipProps as TooltipWrapperProps)}>
      <TooltipTrigger
        className={cn(buttonVariants({ variant, size }), className)}
        {...buttonProps}
      >
        {children}
      </TooltipTrigger>

      <TooltipContent
        {...(tooltipContentProps as TooltipContentProps)}
        className={cn(tooltipClassName, tooltipContentProps?.className)}
      >
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  );
};

export default TooltipButton;
