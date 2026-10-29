import type { SubnetsAccess } from "@/core/types/config";
import { isIP, isIPv4, isIPv6 } from "net";

export type SubnetVerdict =
  | { allowed: true }
  | {
      allowed: false;
      reason: "unknown_ip" | "no_subnets" | "not_in_subnets";
    };

// Used by HTTP and FTP, off means everyone is allowed
export function checkSubnetAccess(
  restriction: SubnetsAccess | null | undefined,
  ip: string | null,
): SubnetVerdict {
  if (!restriction?.enabled) return { allowed: true };
  if (!ip || !isIP(ip)) return { allowed: false, reason: "unknown_ip" };
  if (!restriction.subnets || restriction.subnets.length === 0) {
    return { allowed: false, reason: "no_subnets" };
  }
  const inside = restriction.subnets.some((subnet) => isIpInSubnet(ip, subnet));
  return inside
    ? { allowed: true }
    : { allowed: false, reason: "not_in_subnets" };
}

export function isIpInSubnet(ip: string, subnet: string): boolean {
  try {
    // Parse subnet in CIDR notation (e.g., "192.168.1.0/24")
    const [subnetIP, prefixLength] = subnet.split("/");
    const prefix = parseInt(prefixLength, 10);

    if (!subnetIP || isNaN(prefix)) {
      return false;
    }

    const ipBinary = ipToBinary(ip);
    const subnetBinary = ipToBinary(subnetIP);

    if (!ipBinary || !subnetBinary) {
      return false;
    }

    // Both must be the same family (IPv4 or IPv6)
    if (ipBinary.length !== subnetBinary.length) {
      return false;
    }

    return ipBinary.substring(0, prefix) === subnetBinary.substring(0, prefix);
  } catch {
    // Invalid subnet format
    return false;
  }
}

function ipToBinary(ip: string): string | null {
  if (isIPv4(ip)) {
    return ip
      .split(".")
      .map((part) => parseInt(part, 10).toString(2).padStart(8, "0"))
      .join("");
  } else if (isIPv6(ip)) {
    const expanded = expandIPv6(ip);
    if (!expanded) return null;

    return expanded
      .split(":")
      .map((part) => parseInt(part, 16).toString(2).padStart(16, "0"))
      .join("");
  }
  return null;
}

function expandIPv6(ip: string): string | null {
  // IPv4-mapped addresses are not handled here
  if (ip.includes("::ffff:")) {
    return null;
  }

  const parts = ip.split("::");
  if (parts.length > 2) return null;

  const left = parts[0] ? parts[0].split(":") : [];
  const right = parts[1] ? parts[1].split(":") : [];

  const missing = 8 - left.length - right.length;
  if (missing < 0) return null;

  const middle = Array<string>(missing).fill("0");
  const expanded = [...left, ...middle, ...right];

  return expanded.map((part) => part.padStart(4, "0")).join(":");
}
