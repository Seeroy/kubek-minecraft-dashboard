import { describe, expect, test } from "bun:test";
import { FrameDecoder, stripFrames } from "./frame-decoder";
import { sign } from "./signature";

const TOKEN = "test-token-0123456789";

function frames(payload: object, chunkSize = 3500, id = "1"): string {
  const json = JSON.stringify(payload);
  const sig = sign(TOKEN, json);
  const parts = Math.max(1, Math.ceil(json.length / chunkSize));
  let out = "";
  for (let i = 0; i < parts; i++) {
    const chunk = json.slice(i * chunkSize, (i + 1) * chunkSize);
    out += `\u001b]7768;kc1;${id};${i};${parts};${sig};${chunk}\u0007\n`;
  }
  return out;
}

const ready = { t: "ready", ts: 1 };

describe("FrameDecoder", () => {
  test("cuts a frame out and keeps the text around it", () => {
    const decoder = new FrameDecoder(() => TOKEN);
    const { text, messages } = decoder.feed(
      `[INFO] Done\n${frames(ready)}next line\n`,
    );
    expect(text).toBe("[INFO] Done\nnext line\n");
    expect(messages).toEqual([ready as never]);
  });

  test("handles a frame split at any position", () => {
    const input = `before\n${frames(ready)}after\n`;
    for (let cut = 1; cut < input.length; cut++) {
      const decoder = new FrameDecoder(() => TOKEN);
      const a = decoder.feed(input.slice(0, cut));
      const b = decoder.feed(input.slice(cut));
      expect(a.text + b.text).toBe("before\nafter\n");
      expect([...a.messages, ...b.messages]).toHaveLength(1);
    }
  });

  test("joins a message sent in parts", () => {
    const decoder = new FrameDecoder(() => TOKEN);
    const big = {
      t: "events",
      ts: 1,
      items: [{ type: "chat", ts: 1, message: "x".repeat(500) }],
    };
    const { messages } = decoder.feed(frames(big, 100));
    expect(messages).toEqual([big as never]);
  });

  test("drops frames with a wrong signature", () => {
    const decoder = new FrameDecoder(() => "other-token-0123456789");
    const { text, messages } = decoder.feed(frames(ready));
    expect(text).toBe("");
    expect(messages).toEqual([]);
  });

  test("accepts the CRLF a PTY adds", () => {
    const decoder = new FrameDecoder(() => TOKEN);
    const { text, messages } = decoder.feed(
      frames(ready).replace(/\n$/, "\r\n") + "x\r\n",
    );
    expect(text).toBe("x\r\n");
    expect(messages).toHaveLength(1);
  });

  test("leaves colors and other escapes alone", () => {
    const decoder = new FrameDecoder(() => TOKEN);
    const line = "\u001b[32mgreen\u001b[0m and \u001b]0;title\u0007\n";
    expect(decoder.feed(line).text).toBe(line);
  });

  test("ignores unknown message types", () => {
    const decoder = new FrameDecoder(() => TOKEN);
    expect(decoder.feed(frames({ t: "nope" })).messages).toEqual([]);
  });

  test("gives back an unterminated start that grew too long", () => {
    const decoder = new FrameDecoder(() => TOKEN);
    const junk = `\u001b]7768;${"a".repeat(9000)}`;
    expect(decoder.feed(junk).text).toBe(junk);
  });
});

test("stripFrames cleans old log output", () => {
  expect(stripFrames(`a\n${frames(ready)}b\n`)).toBe("a\nb\n");
});
