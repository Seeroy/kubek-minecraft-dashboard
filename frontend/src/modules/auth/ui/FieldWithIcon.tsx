"use client";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { AnimatePresence, motion } from "framer-motion";
import React from "react";

export interface FieldWithIconProps
  extends Omit<React.ComponentProps<"input">, "ref"> {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  error?: string;
  trailing?: React.ReactNode;
}

export function FieldWithIcon({
  id,
  label,
  icon: Icon,
  error,
  trailing,
  className,
  ref,
  ...inputProps
}: FieldWithIconProps & { ref?: React.Ref<HTMLInputElement> }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          ref={ref}
          aria-invalid={Boolean(error) || undefined}
          className={cn("h-11 pl-9", trailing ? "pr-10" : undefined, className)}
          {...inputProps}
        />
        {trailing ? (
          <div className="absolute top-0 right-3 flex h-11 items-center">
            {trailing}
          </div>
        ) : null}
      </div>
      <AnimatePresence initial={false}>
        {error ? (
          <motion.p
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            transition={{ duration: 0.18 }}
            className="text-xs text-destructive"
          >
            {error}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
