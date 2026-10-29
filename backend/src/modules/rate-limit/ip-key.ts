/**
 * Limiter key of an address. One host usually owns a whole IPv6 /64, so its
 * addresses share a key instead of each getting fresh attempts
 */
export function ipKey(ip: string | null): string {
  if (!ip) return "?";
  if (!ip.includes(":")) return ip;
  const [head, tail = ""] = ip.split("%")[0].toLowerCase().split("::");
  const left = head ? head.split(":") : [];
  const right = tail ? tail.split(":") : [];
  const missing = ip.includes("::") ? 8 - left.length - right.length : 0;
  const groups = [
    ...left,
    ...Array<string>(Math.max(0, missing)).fill("0"),
    ...right,
  ];
  return `${groups
    .slice(0, 4)
    .map((g) => g.replace(/^0+(?=.)/, ""))
    .join(":")}::/64`;
}
