import { ApiErrorCode } from "@/core/errors/error-codes";
import { ApiErrorBodyDto } from "@/core/errors/error-response.dto";
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { v4 as uuidv4 } from "uuid";

@Catch()
export class BadResponseFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const requestId = uuidv4();
    const timestamp = new Date().toISOString();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal server error";
    // Keep string in the union: extensions may throw arbitrary codes
    let code: ApiErrorCode | string = ApiErrorCode.INTERNAL_ERROR;
    let details: any[] | undefined;
    let attemptsLeft: number | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      // string or object here, handle both
      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object") {
        message = (res as any).message || message;
        details = (res as any).details;
        code = (res as any).code || code;
        attemptsLeft = (res as any).attemptsLeft;
      }

      if (status === HttpStatus.UNAUTHORIZED) code = ApiErrorCode.UNAUTHORIZED;
      else if (status === HttpStatus.FORBIDDEN) code = ApiErrorCode.FORBIDDEN;
      else if (status === HttpStatus.NOT_FOUND) code = ApiErrorCode.NOT_FOUND;
      else if (status === HttpStatus.BAD_REQUEST)
        code = ApiErrorCode.BAD_REQUEST;
    }

    const body: ApiErrorBodyDto = {
      statusCode: status,
      code,
      message,
      details,
      attemptsLeft,
      timestamp,
      requestId,
      path: request.url,
    };

    response.status(status).json(body);
  }
}
