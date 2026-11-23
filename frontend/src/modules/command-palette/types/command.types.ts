import type { ComponentType } from "react";

export type CommandGroup = "navigation" | "servers" | "actions" | "extension";

export interface CommandAction {
  id: string;
  group: CommandGroup;
  label: string;
  /** Group header text instead of the group name, extension commands use the extension name */
  groupLabel?: string;
  /** Secondary text shown on the right */
  hint?: string;
  icon?: ComponentType<{ className?: string }>;
  /** Extra text matched by the fuzzy search in addition to the label */
  keywords?: string;
  perform: () => void | Promise<void>;
}
