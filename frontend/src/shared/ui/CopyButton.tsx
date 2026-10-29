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
      aria-label={ title }
      onClick={ handleClick }
      className={ cn(
        "inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary/70",
        className,
      ) }
    >
      <Icon
        data-copied={ copied || undefined }
        className={ cn("size-3.5 transition-transform data-copied:scale-110 data-copied:text-success", iconClassName) }
      />
    </button>
  );
};

export default CopyButton;
