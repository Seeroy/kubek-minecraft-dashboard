import { describe, expect, test } from "bun:test";
import { PropertiesDocument } from "./properties-document";

const SAMPLE = [
  "#Minecraft server properties",
  "#Mon Jan 01 00:00:00 UTC 2024",
  "",
  "motd=A \\u00A7aMinecraft Server",
  "level-seed=-4172144997902289642",
  'generator-settings={"biome"\\:"minecraft:plains"}',
  "resource-pack=https://example.com/pack.zip?a=1&b=2",
  "level-name=",
  "online-mode=false",
  "",
].join("\n");

describe("parse", () => {
  const doc = PropertiesDocument.parse(SAMPLE);

  test("keeps values with = intact", () => {
    expect(doc.get("resource-pack")).toBe(
      "https://example.com/pack.zip?a=1&b=2",
    );
  });

  test("never coerces values", () => {
    expect(doc.get("level-seed")).toBe("-4172144997902289642");
    expect(doc.get("online-mode")).toBe("false");
    expect(doc.get("level-name")).toBe("");
  });

  test("decodes escapes", () => {
    expect(doc.get("motd")).toBe("A §aMinecraft Server");
    expect(doc.get("generator-settings")).toBe('{"biome":"minecraft:plains"}');
  });

  test("accepts colon and whitespace separators", () => {
    const other = PropertiesDocument.parse("a:1\nb 2\nc = 3\n  d=4\ne");
    expect(other.toRecord()).toEqual({ a: "1", b: "2", c: "3", d: "4", e: "" });
  });

  test("keeps trailing whitespace of a value", () => {
    expect(PropertiesDocument.parse("motd=hi  ").get("motd")).toBe("hi  ");
  });

  test("joins continuation lines", () => {
    const other = PropertiesDocument.parse("a=one \\\n    two\nb=3");
    expect(other.get("a")).toBe("one two");
    expect(other.get("b")).toBe("3");
  });

  test("an escaped backslash at the end is not a continuation", () => {
    const other = PropertiesDocument.parse("path=C:\\\\\nb=1");
    expect(other.get("path")).toBe("C:\\");
    expect(other.get("b")).toBe("1");
  });

  test("decodes escaped keys", () => {
    expect(PropertiesDocument.parse("a\\ b\\=c=1").get("a b=c")).toBe("1");
  });

  test("ignores ! comments", () => {
    expect(PropertiesDocument.parse("! note\na=1").keys()).toEqual(["a"]);
  });

  test("a later duplicate wins", () => {
    expect(PropertiesDocument.parse("a=1\na=2").get("a")).toBe("2");
  });
});

describe("serialize", () => {
  test("round-trips untouched text byte for byte", () => {
    expect(PropertiesDocument.parse(SAMPLE).toString()).toBe(SAMPLE);
    const crlf = SAMPLE.replace(/\n/g, "\r\n");
    expect(PropertiesDocument.parse(crlf).toString()).toBe(crlf);
    expect(PropertiesDocument.parse("a=1").toString()).toBe("a=1");
  });

  test("set rewrites only the changed line", () => {
    const doc = PropertiesDocument.parse(SAMPLE);
    doc.set("online-mode", "true");
    expect(doc.toString()).toBe(
      SAMPLE.replace("online-mode=false", "online-mode=true"),
    );
  });

  test("an unchanged value keeps its original spelling", () => {
    const doc = PropertiesDocument.parse(SAMPLE);
    doc.set("motd", "A §aMinecraft Server");
    expect(doc.toString()).toBe(SAMPLE);
  });

  test("new keys are appended", () => {
    const doc = PropertiesDocument.parse("#head\na=1\n");
    doc.set("b", "2");
    expect(doc.toString()).toBe("#head\na=1\nb=2\n");
  });

  test("delete drops every duplicate and keeps comments", () => {
    const doc = PropertiesDocument.parse("#c\na=1\nb=2\na=3\n");
    expect(doc.delete("a")).toBe(true);
    expect(doc.toString()).toBe("#c\nb=2\n");
    expect(doc.delete("missing")).toBe(false);
  });

  test("escapes what the reader would lose", () => {
    const doc = PropertiesDocument.parse("");
    doc.set("motd", " two\nlines\\");
    doc.set("odd key", "x");
    expect(doc.toString()).toBe("motd=\\ two\\nlines\\\\\nodd\\ key=x\n");
    const back = PropertiesDocument.parse(doc.toString());
    expect(back.get("motd")).toBe(" two\nlines\\");
    expect(back.get("odd key")).toBe("x");
  });

  test("assign syncs keys and keeps the layout", () => {
    const doc = PropertiesDocument.parse("#c\na=1\n\nb=2\nc=3\n");
    doc.assign({ a: "1", c: "4", d: "5" });
    expect(doc.toString()).toBe("#c\na=1\n\nc=4\nd=5\n");
  });
});
