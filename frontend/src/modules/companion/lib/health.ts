import type { Tone } from "@/shared/ui/tone";

// 20 TPS is a healthy server, under 15 players feel it
export const tpsTone = (tps: number | null | undefined): Tone => (tps == null ? "gray" : tps >= 18 ? "green" : tps >= 15 ? "amber" : "red");

// A tick has 50 ms before the server falls behind
export const msptTone = (mspt: number | null | undefined): Tone => (mspt == null ? "gray" : mspt <= 40 ? "green" : mspt <= 50 ? "amber" : "red");

export const pingTone = (ping: number | null | undefined): Tone => (ping == null ? "gray" : ping < 100 ? "green" : ping < 250 ? "amber" : "red");

export const fixed = (value: number | null | undefined, digits = 1) => (value == null ? "—" : value.toFixed(digits));
