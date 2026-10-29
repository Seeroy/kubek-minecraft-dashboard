import { describe, expect, test } from "bun:test";
import { demuxLogBuffer, lastStatusMatch } from "./docker-logs";

function frame(type: number, text: string): Buffer {
  const payload = Buffer.from(text, "utf8");
  const header = Buffer.alloc(8);
  header[0] = type;
  header.writeUInt32BE(payload.length, 4);
  return Buffer.concat([header, payload]);
}

describe("demuxLogBuffer", () => {
  test("joins stdout and stderr frames in order", () => {
    const buf = Buffer.concat([
      frame(1, "a\n"),
      frame(2, "b\n"),
      frame(1, "c"),
    ]);
    expect(demuxLogBuffer(buf)).toBe("a\nb\nc");
  });

  test("passes tty output through", () => {
    expect(demuxLogBuffer(Buffer.from("plain\n"), true)).toBe("plain\n");
  });

  test("falls back to raw text when there are no headers", () => {
    expect(demuxLogBuffer(Buffer.from("not framed at all\n"))).toBe(
      "not framed at all\n",
    );
  });

  test("empty buffer", () => {
    expect(demuxLogBuffer(Buffer.alloc(0))).toBe("");
  });
});

describe("lastStatusMatch", () => {
  const patterns = [
    { status: "starting", res: [/Starting minecraft server/i] },
    { status: "running", res: [/Done \(.*\)!/i] },
  ];

  test("the latest matching line wins", () => {
    const lines = ["Starting minecraft server", "x", "Done (3.1s)! For help"];
    expect(lastStatusMatch(lines, patterns)).toBe("running");
  });

  test("undefined when nothing matches", () => {
    expect(lastStatusMatch(["chat line"], patterns)).toBeUndefined();
  });
});
