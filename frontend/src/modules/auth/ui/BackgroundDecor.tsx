"use client";
import { cn } from "@/shared/lib/cn";
import { motion } from "framer-motion";

export function BackgroundDecor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-32 -left-24 size-[420px] rounded-full bg-primary/20 blur-3xl"
      />
      <motion.div
        animate={{ x: [0, -25, 0], y: [0, -15, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-24 -bottom-32 size-[460px] rounded-full bg-primary/15 blur-3xl"
      />
      <div
        className={cn(
          "absolute inset-0 opacity-[0.05] dark:opacity-[0.07]",
          "[background-image:radial-gradient(circle_at_1px_1px,var(--foreground)_1px,transparent_0)]",
          "[background-size:32px_32px]"
        )}
      />
    </div>
  );
}
