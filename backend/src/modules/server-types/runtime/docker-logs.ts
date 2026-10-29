/**
 * Decode a logs() buffer. Without a TTY every chunk has an 8 byte header:
 * stream type, 3 zero bytes, big endian size
 */
export function demuxLogBuffer(buf: Buffer, tty = false): string {
  if (tty) return buf.toString("utf8");
  const parts: Buffer[] = [];
  let offset = 0;
  while (offset + 8 <= buf.length) {
    const type = buf[offset];
    const size = buf.readUInt32BE(offset + 4);
    // No header, it's raw output
    if (type > 2 || buf[offset + 1] || buf[offset + 2] || buf[offset + 3]) {
      return buf.toString("utf8");
    }
    parts.push(buf.subarray(offset + 8, offset + 8 + size));
    offset += 8 + size;
  }
  return Buffer.concat(parts).toString("utf8");
}

/** Last status in old lines, sets the status of an adopted server */
export function lastStatusMatch<T>(
  lines: string[],
  patterns: { status: T; res: RegExp[] }[],
): T | undefined {
  let found: T | undefined;
  for (const line of lines) {
    for (const { status, res } of patterns) {
      if (res.some((re) => re.test(line))) {
        found = status;
        break;
      }
    }
  }
  return found;
}
