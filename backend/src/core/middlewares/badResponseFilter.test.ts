import { describe, expect, test } from "bun:test";
import { ArgumentsHost, BadRequestException, Logger } from "@nestjs/common";
import type { HttpArgumentsHost } from "@nestjs/common/interfaces";
import type { Request, Response } from "express";
import { fake } from "@/testing/fake";
import { BadResponseFilter } from "./badResponseFilter";

function run(exception: unknown) {
  const logged: string[][] = [];
  const filter = new BadResponseFilter();
  Object.assign(filter, {
    logger: fake<Logger>({
      error: (...args: string[]) => void logged.push(args),
    }),
  });
  let status = 0;
  let body: Record<string, unknown> = {};
  const response: Response = fake<Response>({
    setHeader: () => response,
    status: (code) => {
      status = code;
      return fake<Response>({
        json: (data: Record<string, unknown>) => {
          body = data;
          return response;
        },
      });
    },
  });
  const request = fake<Request>({ method: "POST", url: "/api/x" });
  const host = fake<ArgumentsHost>({
    switchToHttp: () =>
      fake<HttpArgumentsHost>({
        getResponse: <T>() => response as T,
        getRequest: <T>() => request as T,
      }),
  });
  filter.catch(exception, host);
  return { logged, status, body };
}

describe("BadResponseFilter", () => {
  test("unknown errors are logged, client gets a generic message", () => {
    const { logged, status, body } = run(new Error("db exploded at /secret"));
    expect(status).toBe(500);
    expect(body.message).toBe("Internal server error");
    expect(logged).toHaveLength(1);
    const [message, stack] = logged[0];
    expect(message).toContain(String(body.requestId));
    expect(message).toContain("POST /api/x");
    expect(stack).toContain("db exploded");
  });

  test("http exceptions pass through without an error log", () => {
    const { logged, status, body } = run(new BadRequestException("nope"));
    expect(status).toBe(400);
    expect(body.message).toBe("nope");
    expect(logged).toHaveLength(0);
  });
});
