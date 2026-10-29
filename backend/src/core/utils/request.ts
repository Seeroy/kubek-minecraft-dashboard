import type { Request } from "express";

// TRUST_PROXY is 1/true/yes for one proxy in front, or the number of proxies
const TRUSTED_HOPS = parseHops(process.env.TRUST_PROXY);

function parseHops(value: string | undefined): number {
  const raw = (value ?? "").trim().toLowerCase();
  if (["1", "true", "yes"].includes(raw)) return 1;
  const hops = Number.parseInt(raw, 10);
  return Number.isFinite(hops) && hops > 0 ? hops : 0;
}

/** Normalize IPv4-mapped IPv6 down to the plain IPv4 form */
function normalizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  const mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  return mapped ? mapped[1] : trimmed;
}

/**
 * Proxies append the address they saw, so the client is the entry our own
 * proxies added, counted from the right. Entries further left come from the
 * client itself and can be anything
 */
function forwardedClient(header: string | string[] | undefined): string | null {
  const list = (Array.isArray(header) ? header.join(",") : (header ?? ""))
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (list.length === 0) return null;
  return list[Math.max(0, list.length - TRUSTED_HOPS)];
}

export function extractClientIp(request: Request | any): string | null {
  if (TRUSTED_HOPS > 0) {
    const forwarded = forwardedClient(request.headers?.["x-forwarded-for"]);
    if (forwarded) return normalizeIp(forwarded);
    if (request.ip) return normalizeIp(request.ip);
  }
  return normalizeIp(
    request.socket?.remoteAddress ??
      request.connection?.remoteAddress ??
      request.connection?.socket?.remoteAddress ??
      null,
  );
}
