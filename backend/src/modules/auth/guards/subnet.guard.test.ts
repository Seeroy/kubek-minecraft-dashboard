import { describe, expect, test } from "bun:test";
import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext, Type } from "@nestjs/common";
import type { HttpArgumentsHost } from "@nestjs/common/interfaces";
import { Reflector } from "@nestjs/core";
import type { SubnetsAccess } from "@shared/types/configs/mainConfig.types";
import type { IConfiguration } from "@/core/types/config";
import { ConfigService } from "@/modules/config/config.service";
import { fake } from "@/testing/fake";
import { Public } from "../decorators/public.decorator";
import { SubnetGuard } from "./subnet.guard";

class Routes {
  privatePage() {}

  @Public()
  publicPage() {}
}

function guard(restriction: SubnetsAccess): SubnetGuard {
  const config = fake<ConfigService>({
    getAll: () =>
      fake<IConfiguration>({ subnetsAccessRestriction: restriction }),
  });
  return new SubnetGuard(config, new Reflector());
}

function from(
  remoteAddress: string | undefined,
  handler: () => void = Routes.prototype.privatePage,
  headers: Record<string, string> = {},
): ExecutionContext {
  const request = { headers, socket: { remoteAddress } };
  return fake<ExecutionContext>({
    getHandler: () => handler,
    getClass: (): Type => Routes,
    switchToHttp: () =>
      fake<HttpArgumentsHost>({ getRequest: <T>() => request as T }),
  });
}

const lan = guard({ enabled: true, subnets: ["192.168.1.0/24", "fd00::/8"] });

describe("SubnetGuard", () => {
  test("disabled restriction lets everyone in", () => {
    expect(guard({ enabled: false }).canActivate(from("8.8.8.8"))).toBe(true);
  });

  test("address inside an allowed subnet passes", () => {
    expect(lan.canActivate(from("192.168.1.42"))).toBe(true);
    expect(lan.canActivate(from("fd12::1"))).toBe(true);
  });

  test("IPv4-mapped IPv6 address is matched as IPv4", () => {
    expect(lan.canActivate(from("::ffff:192.168.1.42"))).toBe(true);
  });

  test("address outside the subnets is a 403", () => {
    expect(() => lan.canActivate(from("192.168.2.1"))).toThrow(
      "Access denied: IP 192.168.2.1 not in allowed subnets",
    );
  });

  test("unknown client address is a 403", () => {
    expect(() => lan.canActivate(from(undefined))).toThrow(
      "Unable to determine client IP address",
    );
  });

  test("enabled restriction with no subnets locks everyone out", () => {
    expect(() =>
      guard({ enabled: true, subnets: [] }).canActivate(from("192.168.1.42")),
    ).toThrow("Access denied: no allowed subnets configured");
  });

  test("X-Forwarded-For is ignored without a trusted proxy", () => {
    expect(() =>
      lan.canActivate(
        from("203.0.113.9", Routes.prototype.privatePage, {
          "x-forwarded-for": "192.168.1.42",
        }),
      ),
    ).toThrow(ForbiddenException);
  });

  test("public routes skip the subnet check", () => {
    expect(
      lan.canActivate(from("203.0.113.9", Routes.prototype.publicPage)),
    ).toBe(true);
  });
});
