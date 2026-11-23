"use client";

import { DropdownMenuSeparator } from "@/shared/ui/dropdown-menu";
import type { SlotName } from "@kubekpanel/extension-sdk";
import { SlotMounts, useExtensionSlotMounts } from "./ExtensionSlot";

// Extension buttons inside a menu get the look of the panel's own menu items
const menuItems =
  "grid [&_a]:flex [&_a]:min-h-8 [&_a]:w-full [&_a]:items-center [&_a]:gap-2 [&_a]:rounded-sm [&_a]:px-2 [&_a]:py-1.5 [&_a]:text-[13px] [&_a]:text-foreground [&_a]:outline-none [&_a:hover]:bg-hover [&_a:focus-visible]:bg-hover [&_button]:flex [&_button]:h-auto [&_button]:min-h-8 [&_button]:w-full [&_button]:cursor-pointer [&_button]:items-center [&_button]:justify-start [&_button]:gap-2 [&_button]:rounded-sm [&_button]:border-0 [&_button]:bg-transparent [&_button]:px-2 [&_button]:py-1.5 [&_button]:text-left [&_button]:text-[13px] [&_button]:font-normal [&_button]:text-foreground [&_button]:shadow-none [&_button]:outline-none [&_button:hover]:bg-hover [&_button:focus-visible]:bg-hover [&_button:disabled]:pointer-events-none [&_button:disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground";

interface Props {
  name: SlotName;
  context?: unknown;
}

/** Slot rendered inside a dropdown menu, under a separator, nothing when no extension uses it */
export const ExtensionMenuSlot = ({ name, context }: Props) => {
  const mounts = useExtensionSlotMounts(name);
  if (!mounts.length) return null;
  return (
    <>
      <DropdownMenuSeparator />
      <div role="group" className={menuItems}>
        <SlotMounts mounts={mounts} context={context} />
      </div>
    </>
  );
};
