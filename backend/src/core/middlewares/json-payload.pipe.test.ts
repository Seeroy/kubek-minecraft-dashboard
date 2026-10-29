import { describe, expect, test } from "bun:test";
import { ApiErrorCode } from "@/core/errors/error-codes";
import { ChangeServerCoreDto } from "@/modules/servers/dto/change-server-core.dto";
import { BadRequestException } from "@nestjs/common";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { JsonPayloadPipe, MultipartPayload } from "./json-payload.pipe";
import { validationPipe } from "./validationPipe";

const pipe = new JsonPayloadPipe(ChangeServerCoreDto);

function responseOf(fn: () => unknown): Record<string, unknown> {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(BadRequestException);
    return (e as BadRequestException).getResponse() as Record<string, unknown>;
  }
  throw new Error("expected a BadRequestException");
}

async function bodyPipeResponse(value: unknown) {
  try {
    await validationPipe.transform(value, {
      type: "body",
      metatype: ChangeServerCoreDto,
    });
  } catch (e) {
    return (e as BadRequestException).getResponse();
  }
  throw new Error("expected a BadRequestException");
}

describe("JsonPayloadPipe", () => {
  test("returns a validated DTO instance", () => {
    const dto = pipe.transform(
      JSON.stringify({ blueprintId: "com.kubek.paper", version: "1.21.4" }),
    );
    expect(dto).toBeInstanceOf(ChangeServerCoreDto);
    expect(dto).toEqual(
      Object.assign(new ChangeServerCoreDto(), {
        blueprintId: "com.kubek.paper",
        version: "1.21.4",
      }),
    );
  });

  test("requires the field and valid JSON", () => {
    expect(responseOf(() => pipe.transform(undefined)).message).toBe(
      "payload field is required",
    );
    expect(responseOf(() => pipe.transform("")).message).toBe(
      "payload field is required",
    );
    expect(responseOf(() => pipe.transform("{nope")).message).toBe(
      "payload must be valid JSON",
    );
  });

  test("reports errors in the common format, without the payload", () => {
    const res = responseOf(() =>
      pipe.transform(JSON.stringify({ version: 5, secret: "x" })),
    );
    expect(res.code).toBe(ApiErrorCode.VALIDATION_ERROR);
    expect(res.message).toBe("Validation failed");
    expect(res).not.toHaveProperty("target");
    expect(JSON.stringify(res)).not.toContain('"x"');
    const fields = (res.details as { field: string }[]).map((d) => d.field);
    expect(new Set(fields)).toEqual(
      new Set(["blueprintId", "version", "secret"]),
    );
  });

  test("MultipartPayload reads the payload field through the pipe", () => {
    class Probe {
      handler(@MultipartPayload(ChangeServerCoreDto) dto: ChangeServerCoreDto) {
        return dto;
      }
    }
    const meta = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      Probe,
      "handler",
    ) as Record<
      string,
      { factory: (data: unknown, ctx: unknown) => unknown; pipes: unknown[] }
    >;
    const [arg] = Object.values(meta);
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ body: { payload: '{"blueprintId":"a"}' } }),
      }),
    };
    expect(arg.factory(undefined, ctx)).toBe('{"blueprintId":"a"}');
    expect(arg.pipes).toHaveLength(1);
    expect(arg.pipes[0]).toBeInstanceOf(JsonPayloadPipe);
  });

  test("matches what the global pipe returns for a JSON body", async () => {
    const body = { version: 5, secret: "x" };
    expect(responseOf(() => pipe.transform(JSON.stringify(body)))).toEqual(
      (await bodyPipeResponse(body)) as Record<string, unknown>,
    );
  });
});
