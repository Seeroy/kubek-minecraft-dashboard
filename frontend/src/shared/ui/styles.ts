import { cn } from "@/shared/lib/cn";

// Class recipes shared by several primitives so each look is defined once

export const popupSurface =
  "origin-(--transform-origin) rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-pop outline-none data-open:animate-pop-in data-closed:animate-out data-closed:fade-out-0 data-closed:duration-100";

export const menuItem =
  "relative flex min-h-8 w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left leading-snug text-[13px] text-foreground outline-none select-none data-highlighted:bg-hover data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:text-muted-foreground [&_svg:not([class*='size-'])]:size-4";

// Plain buttons get no data-highlighted, so hover and focus light them up instead
export const menuButton = cn(menuItem, "cursor-pointer hover:bg-hover focus-visible:bg-hover");

export const menuSeparator = "-mx-1 my-1 h-px bg-border";

export const menuLabel = "label-caps px-2 pt-2 pb-1";

export const fieldBase =
  "w-full min-w-0 rounded-md border border-input bg-field text-[13px] transition-[border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/18 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger/70 aria-invalid:ring-3 aria-invalid:ring-danger/15";
