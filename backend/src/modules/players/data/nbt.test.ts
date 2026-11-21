import { describe, expect, test } from "bun:test";
import { gzipSync } from "zlib";
import { readNbt } from "./nbt";

// Tiny writer, just enough to build test files
const name = (text: string) => {
  const bytes = Buffer.from(text, "utf8");
  const head = Buffer.alloc(2);
  head.writeUInt16BE(bytes.length);
  return Buffer.concat([head, bytes]);
};
const tag = (type: number, key: string, payload: Buffer) =>
  Buffer.concat([Buffer.from([type]), name(key), payload]);
const int = (value: number) => {
  const buf = Buffer.alloc(4);
  buf.writeInt32BE(value);
  return buf;
};
const float = (value: number) => {
  const buf = Buffer.alloc(4);
  buf.writeFloatBE(value);
  return buf;
};
const double = (value: number) => {
  const buf = Buffer.alloc(8);
  buf.writeDoubleBE(value);
  return buf;
};
const END = Buffer.from([0]);
const root = (...tags: Buffer[]) => tag(10, "", Buffer.concat([...tags, END]));

describe("readNbt", () => {
  test("reads a gzipped player file", () => {
    const file = gzipSync(
      root(
        tag(3, "playerGameType", int(1)),
        tag(5, "Health", float(20)),
        tag(8, "Dimension", name("minecraft:the_nether")),
        tag(
          9,
          "Pos",
          Buffer.concat([
            Buffer.from([6]),
            int(3),
            double(1.5),
            double(64),
            double(-3),
          ]),
        ),
        tag(
          10,
          "LastDeathLocation",
          Buffer.concat([
            tag(8, "dimension", name("minecraft:overworld")),
            tag(11, "pos", Buffer.concat([int(3), int(10), int(70), int(-20)])),
            END,
          ]),
        ),
        tag(9, "Inventory", Buffer.concat([Buffer.from([0]), int(0)])),
      ),
    );

    const nbt = readNbt(file);
    expect(nbt.playerGameType).toBe(1);
    expect(nbt.Health).toBe(20);
    expect(nbt.Dimension).toBe("minecraft:the_nether");
    expect(nbt.Pos).toEqual([1.5, 64, -3]);
    expect(
      Array.from((nbt.LastDeathLocation as { pos: Int32Array }).pos),
    ).toEqual([10, 70, -20]);
    expect(nbt.Inventory).toEqual([]);
  });

  test("reads uncompressed data", () => {
    expect(readNbt(root(tag(3, "XpLevel", int(7)))).XpLevel).toBe(7);
  });

  test("rejects a cut off file", () => {
    const whole = root(tag(3, "XpLevel", int(7)));
    expect(() => readNbt(whole.subarray(0, whole.length - 3))).toThrow();
  });

  test("rejects a huge array length without allocating it", () => {
    const bogus = root(tag(11, "pos", int(0x7fffffff)));
    expect(() => readNbt(bogus)).toThrow("Bad NBT array length");
  });

  test("rejects a root that is not a compound", () => {
    expect(() => readNbt(tag(3, "", int(1)))).toThrow();
  });
});
