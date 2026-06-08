import { extractClientIp } from "@/core/utils/request";
import { ConfigService } from "@/modules/config/config.service";
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { isIP, isIPv4, isIPv6 } from "net";
import { IS_PUBLIC_KEY } from "../decorators/public.decorator";

/**
 * Restricts access to clients whose IP falls within a configured set of subnets
 */
@Injectable()
export class SubnetGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const config = this.configService.getAll();
    const subnetRestriction = config.subnetsAccessRestriction;

    if (!subnetRestriction?.enabled) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const clientIP = extractClientIp(request);

    if (!clientIP || !isIP(clientIP)) {
      throw new ForbiddenException("Unable to determine client IP address");
    }

    if (!subnetRestriction.subnets || subnetRestriction.subnets.length === 0) {
      throw new ForbiddenException(
        "Access denied: no allowed subnets configured",
      );
    }

    const isAllowed = subnetRestriction.subnets.some((subnet) => {
      return this.isIPInSubnet(clientIP, subnet);
    });

    if (!isAllowed) {
      throw new ForbiddenException(
        `Access denied: IP ${clientIP} not in allowed subnets`,
      );
    }

    return true;
  }

  private isIPInSubnet(ip: string, subnet: string): boolean {
    try {
      // Parse subnet in CIDR notation (e.g., "192.168.1.0/24")
      const [subnetIP, prefixLength] = subnet.split("/");
      const prefix = parseInt(prefixLength, 10);

      if (!subnetIP || isNaN(prefix)) {
        return false;
      }

      const ipBinary = this.ipToBinary(ip);
      const subnetBinary = this.ipToBinary(subnetIP);

      if (!ipBinary || !subnetBinary) {
        return false;
      }

      // Both must be the same family (IPv4 or IPv6)
      if (ipBinary.length !== subnetBinary.length) {
        return false;
      }

      const networkBits = ipBinary.substring(0, prefix);
      const subnetNetworkBits = subnetBinary.substring(0, prefix);

      return networkBits === subnetNetworkBits;
    } catch (error) {
      // Invalid subnet format
      return false;
    }
  }

  private ipToBinary(ip: string): string | null {
    if (isIPv4(ip)) {
      return ip
        .split(".")
        .map((part) => parseInt(part, 10).toString(2).padStart(8, "0"))
        .join("");
    } else if (isIPv6(ip)) {
      // Expand IPv6 and convert to binary
      const expanded = this.expandIPv6(ip);
      if (!expanded) return null;

      return expanded
        .split(":")
        .map((part) => parseInt(part, 16).toString(2).padStart(16, "0"))
        .join("");
    }
    return null;
  }

  private expandIPv6(ip: string): string | null {
    // Remove IPv4-mapped part if present
    if (ip.includes("::ffff:")) {
      return null; // Not handling IPv4-mapped IPv6 for simplicity
    }

    const parts = ip.split("::");
    if (parts.length > 2) return null;

    const left = parts[0] ? parts[0].split(":") : [];
    const right = parts[1] ? parts[1].split(":") : [];

    const missing = 8 - left.length - right.length;
    if (missing < 0) return null;

    const middle = new Array(missing).fill("0");
    const expanded = [...left, ...middle, ...right];

    return expanded.map((part) => part.padStart(4, "0")).join(":");
  }
}
