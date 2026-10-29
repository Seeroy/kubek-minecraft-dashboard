import { ApiErrorCode } from "@/core/errors/error-codes";
import { ApiErrorBodyDto } from "@/core/errors/error-response.dto";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { randomUUID } from "crypto";

// Fallback codes for statuses when the exception carries no code of its own
const STATUS_CODES: Partial<Record<number, ApiErrorCode>> = {
  [HttpStatus.UNAUTHORIZED]: ApiErrorCode.UNAUTHORIZED,
  [HttpStatus.FORBIDDEN]: ApiErrorCode.FORBIDDEN,
  [HttpStatus.NOT_FOUND]: ApiErrorCode.NOT_FOUND,
  [HttpStatus.BAD_REQUEST]: ApiErrorCode.BAD_REQUEST,
  [HttpStatus.CONFLICT]: ApiErrorCode.CONFLICT,
  [HttpStatus.TOO_MANY_REQUESTS]: ApiErrorCode.RATE_LIMITED,
};

@Catch()
export class BadResponseFilter implements ExceptionFilter {
  private readonly logger = new Logger(BadResponseFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const requestId = randomUUID();
    const timestamp = new Date().toISOString();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    // Keep string in the union: extensions may throw arbitrary codes
    let code: ApiErrorCode | string = ApiErrorCode.INTERNAL_ERROR;
    let details: any[] | undefined;
    let attemptsLeft: number | undefined;
    let retryAfter: number | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      code = STATUS_CODES[status] ?? code;

      // string or object here, handle both
      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object") {
        message = (res as any).message || message;
        details = (res as any).details;
        code = (res as any).code || code;
        attemptsLeft = (res as any).attemptsLeft;
        retryAfter = (res as any).retryAfter;
      }
    } else {
      // Client gets a generic message, the real error goes to the log
      const stack =
        exception instanceof Error
          ? (exception.stack ?? exception.message)
          : String(exception);
      this.logger.error(
        `Unhandled error ${requestId} on ${request.method} ${request.url}`,
        stack,
      );
    }

    if (retryAfter !== undefined) {
      response.setHeader("Retry-After", String(retryAfter));
    }

    const body: ApiErrorBodyDto = {
      statusCode: status,
      code,
      message,
      details,
      attemptsLeft,
      retryAfter,
      timestamp,
      requestId,
      path: request.url,
    };

    response.status(status).json(body);
  }
}
