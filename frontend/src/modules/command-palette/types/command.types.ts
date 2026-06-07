import type { LucideIcon } from "lucide-react";

export type CommandGroup = "navigation" | "servers" | "actions";

export interface CommandAction {
  id: string;
  group: CommandGroup;
  label: string;
  /** Secondary text shown on the right */
  hint?: string;
  icon?: LucideIcon;
  /** Extra text matched by the fuzzy search in addition to the label */
  keywords?: string;
  perform: () => void | Promise<void>;
}
