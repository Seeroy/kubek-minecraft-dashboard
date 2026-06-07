import type { Context, SessionFlavor } from "grammy";

/** Multi-step state for the "create server" wizard, held in the Grammy session */
export interface WizardState {
  step: "name" | "blueprint" | "version" | "confirm";
  name?: string;
  blueprintId?: string;
  blueprintName?: string;
  version?: string;
  versions?: string[];
}

export interface SessionData {
  wizard?: WizardState;
}

export type MyContext = Context & SessionFlavor<SessionData>;
