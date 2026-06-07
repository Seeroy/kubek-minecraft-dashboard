import { Injectable, Logger, NestMiddleware } from "@nestjs/common";

import { NextFunction, Request, Response } from "express";

@Injectable()
export class AppLoggerMiddleware implements NestMiddleware {
  private logger = new Logger("HTTP");

  use(request: Request, response: Response, next: NextFunction): void {
    const { ip, method, baseUrl } = request;

    response.on("close", () => {
      const { statusCode } = response;
      this.logger.log(`[${ip}] ${method} ${baseUrl} - ${statusCode}`);
    });

    next();
  }
}
