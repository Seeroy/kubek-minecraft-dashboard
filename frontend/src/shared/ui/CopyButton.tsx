"use client";
import { cn } from "@/shared/lib/cn";
import { Check, Copy } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";

interface CopyButtonProps {
  value: string;
  className?: string;
  iconClassName?: string;
  title?: string;
  stopPropagation?: boolean;
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  className,
  iconClassName,
  title,
  stopPropagation = true,
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (stopPropagation) e.stopPropagation();
      e.preventDefault();
      try {
        navigator.clipboard?.writeText(value);
        setCopied(true);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setCopied(false), 1200);
      } catch {
        /* noop */
      }
    },
    [value, stopPropagation],
  );

  const Icon = copied ? Check : Copy;

  return (
    <button
      type="button"
      title={ title }
      onClick={ handleClick }
      className={ cn(
        "inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
        className,
      ) }
    >
      <Icon
        className={ cn(
          "h-3.5 w-3.5 transition-transform",
          copied && "text-emerald-400 scale-110",
          iconClassName,
        ) }
      />
    </button>
  );
};

export default CopyButton;
