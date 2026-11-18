import { describe, expect, test } from "bun:test";
import { Jimp } from "jimp";
import { readImageSize } from "./image-size";

describe("readImageSize", () => {
  test.each([
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/bmp",
    "image/tiff",
  ])("reads %s dimensions from the header", async (mime) => {
    const image = new Jimp({ width: 37, height: 21, color: 0xff0000ff });
    const buffer = await image.getBuffer(mime as "image/png");
    expect(readImageSize(buffer)).toEqual({ width: 37, height: 21 });
  });

  test("a png header claiming a huge image is read without decoding", () => {
    const png = Buffer.alloc(33);
    png.writeUInt32BE(0x89504e47, 0);
    png.writeUInt32BE(0x0d0a1a0a, 4);
    png.writeUInt32BE(13, 8);
    png.write("IHDR", 12, "latin1");
    png.writeUInt32BE(60_000, 16);
    png.writeUInt32BE(60_000, 20);
    expect(readImageSize(png)).toEqual({ width: 60_000, height: 60_000 });
  });

  test("unknown or truncated data gives null", () => {
    expect(readImageSize(Buffer.from("hello"))).toBeNull();
    expect(readImageSize(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull();
    expect(readImageSize(Buffer.alloc(0))).toBeNull();
  });
});
