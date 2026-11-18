export interface ImageSize {
  width: number;
  height: number;
}

/** Image size from the file header, null if unknown */
export function readImageSize(buf: Buffer): ImageSize | null {
  try {
    if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
    if (buf.length >= 10 && buf.toString("latin1", 0, 3) === "GIF") {
      return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
    }
    if (buf.length >= 26 && buf.toString("latin1", 0, 2) === "BM") {
      return {
        width: Math.abs(buf.readInt32LE(18)),
        height: Math.abs(buf.readInt32LE(22)),
      };
    }
    if (buf.length >= 4 && buf.readUInt16BE(0) === 0xffd8) return jpegSize(buf);
    const order = buf.toString("latin1", 0, 2);
    if (order === "II" || order === "MM") return tiffSize(buf, order === "II");
  } catch {
    // Truncated header
  }
  return null;
}

function jpegSize(buf: Buffer): ImageSize | null {
  let offset = 2;
  while (offset + 9 < buf.length) {
    if (buf[offset] !== 0xff) return null;
    const marker = buf[offset + 1]!;
    // Fill bytes before a marker
    if (marker === 0xff) {
      offset++;
      continue;
    }
    // Frame headers, minus DHT, JPG and DAC that share the range
    if (
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc
    ) {
      return {
        height: buf.readUInt16BE(offset + 5),
        width: buf.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + buf.readUInt16BE(offset + 2);
  }
  return null;
}

function tiffSize(buf: Buffer, le: boolean): ImageSize | null {
  const u16 = (at: number) =>
    le ? buf.readUInt16LE(at) : buf.readUInt16BE(at);
  const u32 = (at: number) =>
    le ? buf.readUInt32LE(at) : buf.readUInt32BE(at);
  if (u16(2) !== 42) return null;
  const ifd = u32(4);
  const count = u16(ifd);
  let width = 0;
  let height = 0;
  for (let i = 0; i < count; i++) {
    const entry = ifd + 2 + i * 12;
    const tag = u16(entry);
    // Type 3 is SHORT, anything else here is LONG
    const value = u16(entry + 2) === 3 ? u16(entry + 8) : u32(entry + 8);
    if (tag === 256) width = value;
    if (tag === 257) height = value;
  }
  return width && height ? { width, height } : null;
}
