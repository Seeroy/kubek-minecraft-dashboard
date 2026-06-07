import { ApiErrorCode } from "@/core/errors/error-codes";
import { BadRequestException, ValidationPipe } from "@nestjs/common";

export const validationPipe = new ValidationPipe({
  whitelist: true,
  transform: true,
  forbidNonWhitelisted: true,
  exceptionFactory: (errors) => {
    const details = errors.flatMap((err) =>
      Object.values(err.constraints || {}).map((msg) => ({
        field: err.property,
        message: msg,
      })),
    );
    const error = {
      code: ApiErrorCode.VALIDATION_ERROR,
      message: "Validation failed",
      details,
    };
    return new BadRequestException(error);
  },
});
