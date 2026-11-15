import { Injectable, NestMiddleware } from "@nestjs/common";
import * as vfs from "@shared/vfs.js";
import { NextFunction, Request, Response } from "express";
import { createStaticAssets, type StaticAsset } from "./static-assets";

// A vfs.js from an older build has no compressed map, it then serves raw files only
const assets = createStaticAssets(vfs.default, vfs.compressed ?? {});

function send(res: Response, asset: StaticAsset, status = 200) {
  res.status(status).type(asset.type).setHeader("Cache-Control", asset.cacheControl);
  res.setHeader("ETag", asset.etag);
  if (asset.vary) res.setHeader("Vary", "Accept-Encoding");
  if (asset.encoding) res.setHeader("Content-Encoding", asset.encoding);
  // res.send answers 304 by itself when If-None-Match matches the ETag above
  res.send(asset.body);
}

@Injectable()
export class StaticMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const path = (req as Request & { _parsedUrl: { pathname: string } })._parsedUrl.pathname;
    let normalizedPath = path.replace(/^\//, "").replace(/\/$/, "");
    const hasExtension = normalizedPath.includes(".");
    if (normalizedPath.startsWith("api/")) return next();
    if (path === "/") normalizedPath = "index.html";
    const acceptEncoding = req.headers["accept-encoding"];

    // Search for file in bundle
    const file = assets.get(normalizedPath, acceptEncoding);
    if (file) return send(res, file);

    // SPA fallback: direct navigation to a route must serve that
    // route's prerendered HTML
    if (!hasExtension) {
      const routeHtml = assets.get(`${normalizedPath}.html`, acceptEncoding);
      if (routeHtml) return send(res, routeHtml);
    }

    // Every page is prerendered, anything else is a real 404 rather than the dashboard
    const notFound = assets.get("404.html", acceptEncoding);
    if (notFound) return send(res, notFound, 404);

    next();
  }
}
