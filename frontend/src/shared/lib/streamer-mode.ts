export const STREAMER_LEVELS = ["off", "basic", "full"] as const;
export type StreamerLevel = (typeof STREAMER_LEVELS)[number];

// Basic data can't be changed after a recording, secrets can be rotated or deleted
export type Sensitivity = "basic" | "secret";

export const STREAMER_MODE_KEY = "kubek:streamer-mode";
const ON_CLASS = "streamer-mode";
const FULL_CLASS = "streamer-full";

export function readStreamerLevel(): StreamerLevel {
  const classes = document.documentElement.classList;
  if (!classes.contains(ON_CLASS)) return "off";
  return classes.contains(FULL_CLASS) ? "full" : "basic";
}

export const isHiddenAt = (level: StreamerLevel, sensitivity: Sensitivity) =>
  sensitivity === "basic" ? level !== "off" : level === "full";

export const toStreamerLevel = (value: unknown): StreamerLevel =>
  STREAMER_LEVELS.includes(value as StreamerLevel) ? (value as StreamerLevel) : "off";

export function applyStreamerLevel(level: StreamerLevel, persist = true) {
  const classes = document.documentElement.classList;
  classes.toggle(ON_CLASS, level !== "off");
  classes.toggle(FULL_CLASS, level === "full");
  if (!persist) return;
  try {
    localStorage.setItem(STREAMER_MODE_KEY, level);
  } catch {
    // Storage can be blocked, the level still applies for this session
  }
}

// Runs in <head> so [data-private] is blurred before anything paints
export const streamerModeBootScript = `try{var l=localStorage.getItem(${JSON.stringify(STREAMER_MODE_KEY)}),c=document.documentElement.classList;if(l==="basic"||l==="full")c.add(${JSON.stringify(ON_CLASS)});if(l==="full")c.add(${JSON.stringify(FULL_CLASS)})}catch(e){}`;

const HIDDEN = "***";

// Shape stays readable, every word or number turns into the same stars
export const maskValue = (value: string) => value.replace(/[\p{L}\p{N}_]+/gu, HIDDEN);

const OCTET = String.raw`(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)`;
// Stack trace frames like Foo.java:42 look like host:port, keep them
const SOURCE_EXT = /\.(?:java|kts?|scala|groovy|[cm]?js|ts|json|ya?ml|toml|properties|cfg|conf|xml|txt|log)$/i;

// A value can start right after an ANSI color or a Minecraft color code
const startAfter = (chars: string) => String.raw`(?:(?<![§${chars}])|(?<=\x1b\[[\d;]*m|§[\da-fk-or]))`;

const SENSITIVE = new RegExp(
  [
    String.raw`(?<email>${startAfter(String.raw`\w.+-`)}[\w.+-]+@[a-z\d-]+(?:\.[a-z\d-]+)*\.[a-z]{2,})`,
    String.raw`(?<host>${startAfter(String.raw`\w.-`)}(?:[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?\.)+[a-z][a-z\d-]{1,62})(?=:\d{2,5}(?!\d))`,
    String.raw`(?<ipv4>${startAfter(String.raw`\w.`)}(?:${OCTET}\.){3}${OCTET}(?!\w|\.\d))`,
    String.raw`(?<ipv6>${startAfter(String.raw`\w:`)}(?:[\da-f]{0,4}:){2,7}[\da-f]{0,4}(?![\w:]))`,
  ].join("|"),
  "gi"
);

const isIpv6 = (value: string) => {
  if (!/[\da-f]/i.test(value)) return false;
  const doubles = value.split("::").length - 1;
  if (doubles > 1) return false;
  // Without :: only the full eight groups form an address, this keeps 12:34:56 times out
  const groups = value.split(":");
  return doubles === 1 || (groups.length === 8 && groups.every(Boolean));
};

// Loopback and the any address say nothing about the host
const isHarmlessIpv4 = (value: string) => value === "0.0.0.0" || value.startsWith("127.");

/** Hides IPs, emails and host:port pairs inside free text such as console lines */
export function maskText(text: string): string {
  if (!/[.:@]/.test(text)) return text;
  return text.replace(SENSITIVE, (match, ...args) => {
    const groups = args[args.length - 1] as Record<string, string | undefined>;
    if (groups.email) return `${HIDDEN}@${HIDDEN}`;
    if (groups.host) return SOURCE_EXT.test(match) ? match : HIDDEN;
    if (groups.ipv4) return isHarmlessIpv4(match) ? match : `${HIDDEN}.${HIDDEN}.${HIDDEN}.${HIDDEN}`;
    if (groups.ipv6) return match !== "::1" && isIpv6(match) ? `${HIDDEN}:${HIDDEN}::${HIDDEN}` : match;
    return match;
  });
}

const PRIVATE_WORDS: Record<string, Sensitivity> = {
  ip: "basic",
  ips: "basic",
  address: "basic",
  addresses: "basic",
  host: "basic",
  hostname: "basic",
  domain: "basic",
  email: "basic",
  password: "secret",
  passwd: "secret",
  secret: "secret",
  token: "secret",
};

// Field names the word rules can't catch
const PRIVATE_KEYS: Record<string, Sensitivity> = {
  userAgent: "basic",
  sessionClient: "basic",
  telegramId: "secret",
  telegramUsername: "secret",
  chatId: "secret",
  botName: "secret",
  botUsername: "secret",
  firstName: "secret",
  lastName: "secret",
};

/** Sensitivity of a field by its name, server-ip is basic and rcon.password is secret */
export function privateKeyLevel(key: string): Sensitivity | null {
  if (Object.hasOwn(PRIVATE_KEYS, key)) return PRIVATE_KEYS[key];
  const words = key
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .split(/[^a-z\d]+/)
    .map((word) => PRIVATE_WORDS[word]);
  if (words.includes("secret")) return "secret";
  return words.includes("basic") ? "basic" : null;
}
