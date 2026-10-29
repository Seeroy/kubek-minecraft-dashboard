import { ApiErrorCode } from "@/core/errors/error-codes";
import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import { BadRequestException } from "@nestjs/common";

const PLACEHOLDER = /\{\{\s*([\w.]+)\s*\}\}/g;

// Chars that chain or redirect commands in sh and cmd
const SHELL_META = /[;|&$`<>()]/;
// Control chars, newlines included
// eslint-disable-next-line no-control-regex
const CONTROL = /[\x00-\x1f\x7f]/;
// JVM flags that run a shell command themselves
const JVM_COMMAND_HOOK = /(^|\s|["'])-XX:\+?On(Error|OutOfMemoryError)\b/i;

/** Why the value can't go into the launch command, null if it's fine */
export function unsafeLaunchReason(value: string): string | null {
  if (CONTROL.test(value)) return "control characters are not allowed";
  const meta = SHELL_META.exec(value);
  if (meta) return `character "${meta[0]}" is not allowed`;
  if (JVM_COMMAND_HOOK.test(value)) {
    return "-XX:OnError and -XX:OnOutOfMemoryError are not allowed";
  }
  if (!quotesBalanced(value)) return "quotes are not balanced";
  return null;
}

// Quotes have to close inside the value
function quotesBalanced(value: string): boolean {
  let quote: '"' | "'" | null = null;
  for (let i = 0; i < value.length; i++) {
    const ch = value[i];
    if (quote === "'") {
      if (ch === "'") quote = null;
    } else if (ch === "\\" && i + 1 < value.length && value[i + 1] === '"') {
      i++;
    } else if (quote === '"') {
      if (ch === '"') quote = null;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    }
  }
  return quote === null;
}

/** Variables used in the blueprint startup command */
export function launchVariableKeys(
  blueprint: KubekBlueprintManifest,
): string[] {
  const startup = blueprint.startup;
  const templates = [
    startup?.command,
    ...Object.values(startup?.commandByPlatform ?? {}),
  ].filter((t): t is string => typeof t === "string");
  const used = new Set<string>();
  for (const template of templates) {
    for (const match of template.matchAll(PLACEHOLDER)) used.add(match[1]);
  }
  const declared = [
    ...blueprint.variables.map((v) => v.key),
    ...blueprint.ports.map((p) => p.key),
  ];
  return declared.filter((key) => used.has(key));
}

export class UnsafeLaunchArgumentError extends Error {
  constructor(
    readonly key: string,
    readonly reason: string,
  ) {
    super(`Variable ${key} can't be used in the launch command: ${reason}`);
  }
}

/** Throws on the first value that's unsafe for the shell */
export function assertLaunchVariablesSafe(
  blueprint: KubekBlueprintManifest,
  variables: Record<string, unknown> | undefined,
): void {
  if (!variables) return;
  for (const key of launchVariableKeys(blueprint)) {
    const value = variables[key];
    if (typeof value !== "string") continue;
    const reason = unsafeLaunchReason(value);
    if (reason) throw new UnsafeLaunchArgumentError(key, reason);
  }
}

/** Same, but a 400 for API input */
export function assertLaunchVariablesSafeForRequest(
  blueprint: KubekBlueprintManifest,
  variables: Record<string, unknown> | undefined,
): void {
  try {
    assertLaunchVariablesSafe(blueprint, variables);
  } catch (err) {
    if (!(err instanceof UnsafeLaunchArgumentError)) throw err;
    throw new BadRequestException({
      code: ApiErrorCode.UNSAFE_LAUNCH_ARGUMENT,
      message: err.message,
      details: [{ field: err.key, reason: err.reason }],
    });
  }
}
