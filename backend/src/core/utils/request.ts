import type { Request } from "express";

const TRUST_PROXY = ["1", "true", "yes"].includes(
  (process.env.TRUST_PROXY ?? "").toLowerCase(),
);

export function isProxyTrusted(): boolean {
  return TRUST_PROXY;
}

/** Normalize IPv4-mapped IPv6 down to the plain IPv4 form */
function normalizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  const mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  return mapped ? mapped[1] : trimmed;
}

export function extractClientIp(request: Request | any): string | null {
  if (TRUST_PROXY) {
    const forwarded = request.headers?.["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return normalizeIp(forwarded.split(",")[0]);
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return normalizeIp(forwarded[0].split(",")[0]);
    }
    if (request.ip) return normalizeIp(request.ip);
  }
  return normalizeIp(
    request.socket?.remoteAddress ??
      request.connection?.remoteAddress ??
      request.connection?.socket?.remoteAddress ??
      null,
  );
}
