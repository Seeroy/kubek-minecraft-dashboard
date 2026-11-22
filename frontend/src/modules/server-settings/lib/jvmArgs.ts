import { buildAikarFlags, buildTunedFlags, PROXY_FLAGS, splitArgs } from "@/modules/server/modals/CreateServerModal/wizard/jvm";

// file.encoding is already in every launch command, these cover what the console reads
export const UTF8_FLAGS = ["-Dstdout.encoding=UTF-8", "-Dstderr.encoding=UTF-8", "-Dsun.stdout.encoding=UTF-8", "-Dsun.stderr.encoding=UTF-8"];

const flagKey = (token: string) => token.split("=")[0];

interface TunedSet {
  /** Exact strings the switch writes */
  presets: string[];
  keys: Set<string>;
  /** Found among hand edited flags */
  present: (tokens: string[]) => boolean;
}

const AIKAR: TunedSet = {
  // Small and large heap sets differ, either can be stored
  presets: [buildAikarFlags(0).join(" "), buildAikarFlags(Number.MAX_SAFE_INTEGER).join(" ")],
  keys: new Set(buildAikarFlags(0).map(flagKey)),
  present: (tokens) => tokens.includes("-Daikars.new.flags=true"),
};

const PROXY: TunedSet = {
  presets: [PROXY_FLAGS.join(" ")],
  keys: new Set(PROXY_FLAGS.map(flagKey)),
  present: (tokens) => PROXY_FLAGS.every((flag) => tokens.includes(flag)),
};

const UTF8_KEYS = new Set(UTF8_FLAGS.map(flagKey));
const UTF8_PRESET = UTF8_FLAGS.join(" ");

export interface JvmArgsParts {
  /** Aikar's set, or the proxy one on proxies */
  tuned: boolean;
  utf8: boolean;
  /** Everything besides the presets, kept as typed */
  extra: string;
}

const stripPrefix = (value: string, prefix: string) =>
  value === prefix ? "" : value.startsWith(`${prefix} `) ? value.slice(prefix.length + 1) : null;

/** Splits JVM_ARGS into the preset switches and the rest */
export function parseJvmArgs(raw: string, proxy: boolean): JvmArgsParts {
  const set = proxy ? PROXY : AIKAR;
  let rest = raw;
  let tuned = false;
  let utf8 = false;

  for (const preset of set.presets) {
    const stripped = stripPrefix(rest, preset);
    if (stripped !== null) {
      rest = stripped;
      tuned = true;
      break;
    }
  }
  const afterUtf8 = stripPrefix(rest, UTF8_PRESET);
  if (afterUtf8 !== null) {
    rest = afterUtf8;
    utf8 = true;
  }

  // Edited by hand or written elsewhere, fall back to dropping known flags
  const tokens = splitArgs(rest);
  const looseTuned = !tuned && set.present(tokens);
  const looseUtf8 = !utf8 && UTF8_FLAGS.every((flag) => tokens.includes(flag));
  if (looseTuned || looseUtf8) {
    rest = tokens
      .filter((token) => !(looseTuned && set.keys.has(flagKey(token))) && !(looseUtf8 && UTF8_KEYS.has(flagKey(token))))
      .join(" ");
  }

  return { tuned: tuned || looseTuned, utf8: utf8 || looseUtf8, extra: rest };
}

// Leaves the text as is unless one of the keys is really there
function dropKeys(extra: string, keys: Set<string>): string {
  const tokens = splitArgs(extra);
  return tokens.some((token) => keys.has(flagKey(token))) ? tokens.filter((token) => !keys.has(flagKey(token))).join(" ") : extra;
}

/** Back to one JVM_ARGS string, Aikar's set follows the current heap size */
export function composeJvmArgs({ tuned, utf8, extra }: JvmArgsParts, maxMemoryMb: number, proxy: boolean): string {
  // A preset turned on replaces its own flags typed elsewhere, no duplicates
  let rest = tuned ? dropKeys(extra, (proxy ? PROXY : AIKAR).keys) : extra;
  if (utf8) rest = dropKeys(rest, UTF8_KEYS);
  return [tuned ? buildTunedFlags(maxMemoryMb, proxy).join(" ") : "", utf8 ? UTF8_PRESET : "", rest].filter(Boolean).join(" ");
}
