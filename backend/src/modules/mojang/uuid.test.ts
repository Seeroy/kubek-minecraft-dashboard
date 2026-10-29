import { describe, expect, test } from "bun:test";
import { formatUuid, offlineUuid } from "./uuid";

describe("offlineUuid", () => {
  test("matches the server's offline UUID", () => {
    expect(offlineUuid("Notch")).toBe("b50ad385-829d-3141-a216-7e7d7539ba7f");
  });

  test("is case sensitive like the server", () => {
    expect(offlineUuid("notch")).not.toBe(offlineUuid("Notch"));
  });

  test("is a version 3 RFC 4122 UUID", () => {
    expect(offlineUuid("Steve")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-3[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe("formatUuid", () => {
  test("adds dashes", () => {
    expect(formatUuid("069A79F444E94726A5BEFCA90E38AAF5")).toBe(
      "069a79f4-44e9-4726-a5be-fca90e38aaf5",
    );
  });

  test("keeps dashed input", () => {
    expect(formatUuid("069a79f4-44e9-4726-a5be-fca90e38aaf5")).toBe(
      "069a79f4-44e9-4726-a5be-fca90e38aaf5",
    );
  });
});
