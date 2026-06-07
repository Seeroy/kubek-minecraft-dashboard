import { Injectable, NestMiddleware } from "@nestjs/common";
import staticRoutes from "@shared/vfs.js";
import { NextFunction, Request, Response } from "express";
import { lookup } from "mime-types";

@Injectable()
export class StaticMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = req["_parsedUrl"].pathname;
    let normalizedPath = path.replace(/^\//, "").replace(/\/$/, "");
    const hasExtension = normalizedPath.includes(".");
    if (normalizedPath.startsWith("api/")) return next();
    if (path === "/") normalizedPath = "index.html";

    // Search for file in bundle
    if (staticRoutes[normalizedPath]) {
      const mimeType = lookup(normalizedPath) || "application/octet-stream";
      res
        .status(200)
        .type(mimeType)
        .send(Buffer.from(staticRoutes[normalizedPath], "base64"));
      return;
    }

    // SPA fallback: direct navigation to a route must serve that
    // route's prerendered HTML
    if (!hasExtension) {
      const routeHtml = `${normalizedPath}.html`;
      if (staticRoutes[routeHtml]) {
        res
          .status(200)
          .type("text/html")
          .send(Buffer.from(staticRoutes[routeHtml], "base64"));
        return;
      }
      if (staticRoutes["index.html"]) {
        res
          .status(200)
          .type("text/html")
          .send(Buffer.from(staticRoutes["index.html"], "base64"));
        return;
      }
    }

    // 404 fallback for missing assets/files
    if (!normalizedPath || !staticRoutes[normalizedPath]) {
      res
        .status(404)
        .type("text/html")
        .send(Buffer.from(staticRoutes["404.html"], "base64"));
      return;
    }

    next();
  }
}
