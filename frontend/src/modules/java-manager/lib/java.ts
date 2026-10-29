import type { JavaVersion } from "@/api/java/java.model";
import type { Server } from "@/modules/server";
import type { Tone } from "@/shared/ui/tone";

// A version keeps one color everywhere, so Java 21 always reads the same
const TONES: Record<number, Tone> = { 8: "gray", 11: "cyan", 17: "blue", 21: "orange", 25: "purple" };

export const majorOf = (version: string | number | undefined) => {
  const text = String(version ?? "");
  // Legacy 1.8.0_432 style versions carry the major after the "1."
  const match = text.match(/^1\.(\d+)/) ?? text.match(/^(\d+)/);
  return match ? Number(match[1]) : null;
};

export const javaTone = (major: number | null): Tone => (major && TONES[major]) || "green";

export const LTS = new Set([8, 11, 17, 21, 25]);

export interface GameRange {
  from: string;
  // Open ended when missing, the major still fits current releases
  to?: string;
}

/** Minecraft releases a Java major fits best, null for majors too old to matter */
export function gameRangeOf(major: number | null): GameRange | null {
  if (!major || major < 8) return null;
  if (major === 8) return { from: "1.8", to: "1.16.5" };
  if (major < 16) return { from: "1.12", to: "1.16.5" };
  if (major === 16) return { from: "1.17", to: "1.17.1" };
  if (major === 17) return { from: "1.17", to: "1.20.4" };
  if (major < 21) return { from: "1.18", to: "1.20.4" };
  if (major < 25) return { from: "1.20.5", to: "1.21.11" };
  return { from: "26.1" };
}

export type JavaKind = "managed" | "system" | "custom";

export interface ServerJava {
  server: Server;
  kind: JavaKind;
  major: number | null;
  // Set for a custom binary, the JAVA_PATH override
  path?: string;
}

/** Which Java every server runs on, read from its blueprint variables */
export function serverJavaUsage(servers: Server[], customs: JavaVersion[]): ServerJava[] {
  const result: ServerJava[] = [];
  for (const server of servers) {
    const path = server.variables?.JAVA_PATH;
    // Docker images ship their own Java, a host path does not apply there
    if (server.runtimeKind !== "docker" && typeof path === "string" && path) {
      const custom = customs.find((java) => java.path === path);
      result.push({ server, kind: "custom", major: majorOf(custom?.version), path });
      continue;
    }
    const raw = server.variables?.JAVA_VERSION;
    if (raw == null || raw === "") continue;
    result.push(String(raw) === "system" ? { server, kind: "system", major: null } : { server, kind: "managed", major: majorOf(String(raw)) });
  }
  return result;
}
