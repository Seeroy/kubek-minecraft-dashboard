import { connect, type Socket } from "node:net";

// Source RCON packet types
const AUTH = 3;
const AUTH_RESPONSE = 2;
const EXEC = 2;
const RESPONSE = 0;
const DEFAULT_TIMEOUT_MS = 5_000;

export interface RconTarget {
  host: string;
  port: number;
  password: string;
  timeoutMs?: number;
}

export class RconError extends Error {}

export function encodePacket(id: number, type: number, body: string): Buffer {
  const payload = Buffer.from(body, "utf8");
  // id + type + body + two null bytes
  const size = 4 + 4 + payload.length + 2;
  const packet = Buffer.alloc(4 + size);
  packet.writeInt32LE(size, 0);
  packet.writeInt32LE(id, 4);
  packet.writeInt32LE(type, 8);
  payload.copy(packet, 12);
  return packet;
}

interface Packet {
  id: number;
  type: number;
  body: string;
}

/** Splits a TCP stream into packets, the rest waits for the next chunk */
export function decodePackets(buffer: Buffer): { packets: Packet[]; rest: Buffer } {
  const packets: Packet[] = [];
  let offset = 0;
  while (buffer.length - offset >= 4) {
    const size = buffer.readInt32LE(offset);
    if (size < 10 || size > 1 << 20) throw new RconError(`bad packet size ${size}`);
    if (buffer.length - offset - 4 < size) break;
    const id = buffer.readInt32LE(offset + 4);
    const type = buffer.readInt32LE(offset + 8);
    const body = buffer.toString("utf8", offset + 12, offset + 4 + size - 2);
    packets.push({ id, type, body });
    offset += 4 + size;
  }
  return { packets, rest: buffer.subarray(offset) };
}

/** Logs in and runs one command, resolves with the server reply */
export function rconCommand(target: RconTarget, command: string): Promise<string> {
  const timeoutMs = target.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  return new Promise((resolve, reject) => {
    const socket: Socket = connect({ host: target.host, port: target.port });
    let buffer: Buffer = Buffer.alloc(0);
    let authed = false;
    let reply = "";
    let settled = false;

    const finish = (error: Error | null, value = "") => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      if (error) reject(error);
      else resolve(value);
    };

    const timer = setTimeout(() => finish(new RconError(`no answer in ${timeoutMs} ms`)), timeoutMs);

    socket.on("connect", () => socket.write(encodePacket(1, AUTH, target.password)));
    socket.on("error", (error) => finish(new RconError(error.message)));
    // A server shutting down often drops the socket right after the command, that's a success
    socket.on("close", () => finish(authed ? null : new RconError("connection closed before login"), reply));

    socket.on("data", (chunk: Buffer) => {
      let packets: Packet[];
      try {
        const decoded = decodePackets(Buffer.concat([buffer, chunk]));
        packets = decoded.packets;
        buffer = decoded.rest;
      } catch (error) {
        return finish(error as Error);
      }
      for (const packet of packets) {
        if (!authed) {
          if (packet.type !== AUTH_RESPONSE) continue;
          if (packet.id === -1) return finish(new RconError("wrong password"));
          authed = true;
          socket.write(encodePacket(2, EXEC, command));
        } else if (packet.type === RESPONSE && packet.id === 2) {
          reply += packet.body;
          return finish(null, reply);
        }
      }
    });
  });
}
