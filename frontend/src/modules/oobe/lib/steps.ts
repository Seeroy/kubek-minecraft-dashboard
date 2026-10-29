import type { Tone } from "@/shared/ui/tone";
import { Check, FileText, type LucideIcon, Server, SlidersHorizontal } from "lucide-react";

export type OOBEStep = "eula" | "preferences" | "serverCreation" | "completion";

export const STEPS: { id: OOBEStep; icon: LucideIcon; tone: Tone }[] = [
  { id: "eula", icon: FileText, tone: "blue" },
  { id: "preferences", icon: SlidersHorizontal, tone: "purple" },
  { id: "serverCreation", icon: Server, tone: "amber" },
  { id: "completion", icon: Check, tone: "green" },
];
