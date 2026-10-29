import { describe, expect, test } from "bun:test";
import { restorePanelProperties } from "./panel-properties";

const original = [
  "server-port=25570",
  "query.port=25570",
  "enable-query=true",
  "online-mode=false",
].join("\n");

describe("restorePanelProperties", () => {
  test("keeps the panel port over the pack's", () => {
    const overridden = [
      "#Pack defaults",
      "motd=Welcome=friends",
      "server-port=25565",
      "difficulty=hard",
    ].join("\n");
    expect(restorePanelProperties(overridden, original)).toBe(
      [
        "#Pack defaults",
        "motd=Welcome=friends",
        "server-port=25570",
        "difficulty=hard",
        "query.port=25570",
        "enable-query=true",
        "",
      ].join("\n"),
    );
  });

  test("leaves comments and unrelated keys untouched", () => {
    const overridden = "# server-port=1\nquery.port=1\n";
    const result = restorePanelProperties(overridden, original);
    expect(result.startsWith("# server-port=1\nquery.port=25570\n")).toBe(true);
    expect(result).toContain("server-port=25570");
  });
});
