import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// Custom spacing tokens from globals.css, so h-ctl and h-11 resolve as a conflict
const twMerge = extendTailwindMerge({
  extend: { theme: { spacing: ["ctl", "row"] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
