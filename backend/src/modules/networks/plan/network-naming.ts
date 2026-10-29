import { randomBytes } from "crypto";

const SECRET_ALPHABET =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

/** Velocity server key from a panel name, unique among the taken ones */
export function aliasFor(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base =
    name
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "server";
  let alias = base;
  for (let i = 2; used.has(alias); i++) alias = `${base}-${i}`;
  return alias;
}

/** First free ports from start up, skipping the used ones */
export function freePorts(
  used: Set<number>,
  count: number,
  start: number,
): number[] {
  const out: number[] = [];
  for (let port = start; out.length < count && port <= 65535; port++) {
    if (!used.has(port)) out.push(port);
  }
  return out;
}

/** Random secret for Velocity modern forwarding */
export function generateSecret(length = 24): string {
  const bytes = randomBytes(length);
  return Array.from(
    bytes,
    (b) => SECRET_ALPHABET[b % SECRET_ALPHABET.length],
  ).join("");
}

/** Hides a secret inside text shown to the user */
export function maskSecret(text: string, secret: string): string {
  return secret ? text.split(secret).join("********") : text;
}
