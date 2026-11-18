import { isIP } from "net";
import { isIpInSubnet } from "./subnets";

// Only the fields we read, so express requests and raw sockets both fit
export interface ClientRequestLike {
  headers?: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
  connection?: {
    remoteAddress?: string;
    socket?: { remoteAddress?: string };
  };
}

export interface ProxyTrust {
  // Our own proxies in front of Kubek
  hops: number;
  // Trust CF-Connecting-IP from Cloudflare addresses
  cloudflare: boolean;
}

// https://www.cloudflare.com/ips/
export const CLOUDFLARE_RANGES = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];

const ENV_TRUST: ProxyTrust = {
  hops: parseHops(process.env.TRUST_PROXY),
  cloudflare: parseFlag(process.env.TRUST_CLOUDFLARE),
};

function parseFlag(value: string | undefined): boolean {
  return ["1", "true", "yes"].includes((value ?? "").trim().toLowerCase());
}

// TRUST_PROXY is 1/true/yes for one proxy in front, or the number of proxies
export function parseHops(value: string | undefined): number {
  if (parseFlag(value)) return 1;
  const hops = Number.parseInt((value ?? "").trim(), 10);
  return Number.isFinite(hops) && hops > 0 ? hops : 0;
}

/** Normalize IPv4-mapped IPv6 down to the plain IPv4 form */
function normalizeIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const trimmed = ip.trim();
  const mapped = trimmed.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  return mapped ? mapped[1] : trimmed;
}

function firstHeader(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export function isCloudflareIp(ip: string): boolean {
  return CLOUDFLARE_RANGES.some((range) => isIpInSubnet(ip, range));
}

/**
 * Proxies append the address they saw, so the client is the entry our own
 * proxies added, counted from the right. Entries further left come from the
 * client itself and can be anything
 */
function forwardedClient(
  header: string | string[] | undefined,
  hops: number,
): string | null {
  const list = (Array.isArray(header) ? header.join(",") : (header ?? ""))
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (list.length === 0) return null;
  return list[Math.max(0, list.length - hops)];
}

// Whoever connected to our outermost proxy
function peerIp(request: ClientRequestLike, hops: number): string | null {
  if (hops > 0) {
    const forwarded = forwardedClient(
      request.headers?.["x-forwarded-for"],
      hops,
    );
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

export function resolveClientIp(
  request: ClientRequestLike,
  trust: ProxyTrust,
): string | null {
  const peer = peerIp(request, trust.hops);
  if (!trust.cloudflare || !peer || !isCloudflareIp(peer)) return peer;
  // Cloudflare always rewrites it, so it can't be faked
  const connecting = normalizeIp(
    firstHeader(request.headers?.["cf-connecting-ip"]),
  );
  return connecting && isIP(connecting) ? connecting : peer;
}

export function extractClientIp(request: ClientRequestLike): string | null {
  return resolveClientIp(request, ENV_TRUST);
}
