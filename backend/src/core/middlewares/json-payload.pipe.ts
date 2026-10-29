import { validationExceptionFactory } from "@/core/middlewares/validationPipe";
import {
  BadRequestException,
  createParamDecorator,
  type ExecutionContext,
  Injectable,
  type PipeTransform,
} from "@nestjs/common";
import { type ClassConstructor, plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import type { Request } from "express";

/** Multipart routes send JSON as a string field, parse and validate it like a normal body */
@Injectable()
export class JsonPayloadPipe<T extends object> implements PipeTransform<
  unknown,
  T
> {
  constructor(private readonly dto: ClassConstructor<T>) {}

  transform(value: unknown): T {
    if (!value) {
      throw new BadRequestException("payload field is required");
    }

    let parsed: unknown;
    try {
      if (typeof value !== "string") throw new TypeError("not a string");
      parsed = JSON.parse(value);
    } catch {
      throw new BadRequestException("payload must be valid JSON");
    }

    const dto = plainToInstance(this.dto, parsed);
    const errors = validateSync(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errors.length > 0) throw validationExceptionFactory(errors);
    return dto;
  }
}

// Own decorator, otherwise the global pipe validates the raw string
const PayloadField = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): unknown =>
    ctx.switchToHttp().getRequest<Request>().body?.payload,
);

/** Validated DTO from the multipart payload field */
export const MultipartPayload = <T extends object>(dto: ClassConstructor<T>) =>
  PayloadField(new JsonPayloadPipe(dto));
