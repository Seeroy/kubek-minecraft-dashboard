import { gunzipSync } from "zlib";

export type NbtValue =
  | number
  | bigint
  | string
  | NbtValue[]
  | NbtCompound
  | Int32Array
  | Int8Array
  | BigInt64Array;

export interface NbtCompound {
  [key: string]: NbtValue;
}

// Player files are a few KB, anything bigger is not a player file
const MAX_UNPACKED = 32 * 1024 * 1024;
const MAX_DEPTH = 512;

const TAG = {
  END: 0,
  BYTE: 1,
  SHORT: 2,
  INT: 3,
  LONG: 4,
  FLOAT: 5,
  DOUBLE: 6,
  BYTE_ARRAY: 7,
  STRING: 8,
  LIST: 9,
  COMPOUND: 10,
  INT_ARRAY: 11,
  LONG_ARRAY: 12,
} as const;

class Reader {
  private offset = 0;
  private readonly view: DataView;

  constructor(private readonly buf: Buffer) {
    this.view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  private take(bytes: number): number {
    if (bytes < 0 || this.offset + bytes > this.buf.length) {
      throw new Error("NBT data ends too early");
    }
    const at = this.offset;
    this.offset += bytes;
    return at;
  }

  u8 = () => this.view.getUint8(this.take(1));
  i8 = () => this.view.getInt8(this.take(1));
  i16 = () => this.view.getInt16(this.take(2));
  u16 = () => this.view.getUint16(this.take(2));
  i32 = () => this.view.getInt32(this.take(4));
  i64 = () => this.view.getBigInt64(this.take(8));
  f32 = () => this.view.getFloat32(this.take(4));
  f64 = () => this.view.getFloat64(this.take(8));

  string(): string {
    const length = this.u16();
    const at = this.take(length);
    return this.buf.toString("utf8", at, at + length);
  }

  private count(itemSize: number): number {
    const length = this.i32();
    // Checked up front so a bogus length can't allocate gigabytes
    if (length < 0 || length * itemSize > this.buf.length - this.offset) {
      throw new Error("Bad NBT array length");
    }
    return length;
  }

  value(type: number, depth: number): NbtValue {
    if (depth > MAX_DEPTH) throw new Error("NBT nested too deep");
    switch (type) {
      case TAG.BYTE:
        return this.i8();
      case TAG.SHORT:
        return this.i16();
      case TAG.INT:
        return this.i32();
      case TAG.LONG:
        return this.i64();
      case TAG.FLOAT:
        return this.f32();
      case TAG.DOUBLE:
        return this.f64();
      case TAG.STRING:
        return this.string();
      case TAG.BYTE_ARRAY: {
        const length = this.count(1);
        return Int8Array.from({ length }, () => this.i8());
      }
      case TAG.INT_ARRAY: {
        const length = this.count(4);
        return Int32Array.from({ length }, () => this.i32());
      }
      case TAG.LONG_ARRAY: {
        const length = this.count(8);
        return BigInt64Array.from({ length }, () => this.i64());
      }
      case TAG.LIST: {
        const itemType = this.u8();
        // Empty lists are typed END, items take at least a byte otherwise
        const length = this.count(itemType === TAG.END ? 0 : 1);
        return Array.from({ length }, () => this.value(itemType, depth + 1));
      }
      case TAG.COMPOUND:
        return this.compound(depth + 1);
      default:
        throw new Error(`Unknown NBT tag ${type}`);
    }
  }

  compound(depth: number): NbtCompound {
    const result: NbtCompound = Object.create(null);
    for (;;) {
      const type = this.u8();
      if (type === TAG.END) return result;
      const name = this.string();
      result[name] = this.value(type, depth);
    }
  }
}

/** Java edition NBT, gzipped like player files or raw */
export function readNbt(data: Buffer): NbtCompound {
  const buf =
    data[0] === 0x1f && data[1] === 0x8b
      ? gunzipSync(data, { maxOutputLength: MAX_UNPACKED })
      : data;
  const reader = new Reader(buf);
  if (reader.u8() !== TAG.COMPOUND)
    throw new Error("NBT root is not a compound");
  reader.string();
  return reader.compound(0);
}
