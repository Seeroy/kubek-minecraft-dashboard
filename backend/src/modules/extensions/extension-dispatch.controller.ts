import { CurrentUser } from "@/modules/auth/decorators/current-user.decorator";
import { BearerAuthGuard } from "@/modules/auth/guards/bearer.guard";
import type {
  ExtRequest,
  ExtResponse,
  ExtRoute,
  ExtUser,
} from "@kubekpanel/extension-sdk";
import {
  All,
  Controller,
  ForbiddenException,
  NotFoundException,
  Param,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiExcludeController } from "@nestjs/swagger";
import type { IUser } from "@shared/types/user.types";
import type { Request, Response } from "express";
import { ExtensionRegistry } from "./extension-registry.service";

/**
 * Dispatches /api/ext/:extId/* to routes an extension registered via ctx.http.registerRoutes
 */
@ApiExcludeController()
@ApiBearerAuth()
@Controller("api/ext")
@UseGuards(BearerAuthGuard)
export class ExtensionDispatchController {
  constructor(private readonly registry: ExtensionRegistry) {}

  @All(":extId/*path")
  async dispatch(
    @Param("extId") extId: string,
    @CurrentUser() user: IUser,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.registry.isActive(extId))
      throw new NotFoundException(`Extension not active: ${extId}`);

    const subPath = this.subPath(req.path, extId);
    const route = this.match(
      this.registry.getRoutes(extId),
      req.method,
      subPath,
    );
    if (!route)
      throw new NotFoundException(`No route for ${req.method} ${subPath}`);

    if (
      route.permission &&
      !user.isAdmin &&
      !user.permissions.some((p) => p === route.permission)
    ) {
      throw new ForbiddenException(`Missing permission: ${route.permission}`);
    }

    const extReq: ExtRequest = {
      user: this.toExtUser(user),
      body: req.body,
      query: this.stringRecord(req.query),
      params: this.extractParams(route.path, subPath),
    };

    let sent = false;
    const extRes: ExtResponse = {
      json: (data) => {
        sent = true;
        res.json(data);
      },
      status: (code) => {
        res.status(code);
        return extRes;
      },
      send: (body) => {
        sent = true;
        res.send(body);
      },
    };

    const result = await route.handler(extReq, extRes);
    if (!sent) res.json(result ?? null);
  }

  /** Strip the /api/ext/<extId> prefix, leaving the route-relative path (always leading slash) */
  private subPath(fullPath: string, extId: string): string {
    const prefix = `/api/ext/${extId}`;
    const rest = fullPath.startsWith(prefix)
      ? fullPath.slice(prefix.length)
      : fullPath;
    return rest.startsWith("/") ? rest : `/${rest}`;
  }

  /** First route matching method and path, supporting :param segments and ALL */
  private match(
    routes: ExtRoute[],
    method: string,
    path: string,
  ): ExtRoute | null {
    const want = method.toUpperCase();
    for (const route of routes) {
      if (route.method !== "ALL" && route.method !== want) continue;
      if (this.pathMatches(route.path, path)) return route;
    }
    return null;
  }

  private pathMatches(pattern: string, path: string): boolean {
    const a = this.segments(pattern);
    const b = this.segments(path);
    if (a.length !== b.length) return false;
    return a.every((seg, i) => seg.startsWith(":") || seg === b[i]);
  }

  private extractParams(pattern: string, path: string): Record<string, string> {
    const a = this.segments(pattern);
    const b = this.segments(path);
    const params: Record<string, string> = {};
    a.forEach((seg, i) => {
      if (seg.startsWith(":")) params[seg.slice(1)] = b[i] ?? "";
    });
    return params;
  }

  private segments(p: string): string[] {
    return p.split("/").filter(Boolean);
  }

  private stringRecord(query: Request["query"]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (typeof value === "string") out[key] = value;
      else if (Array.isArray(value) && typeof value[0] === "string")
        out[key] = value[0];
    }
    return out;
  }

  private toExtUser(user: IUser): ExtUser {
    return {
      id: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
      permissions: user.permissions,
    };
  }
}
