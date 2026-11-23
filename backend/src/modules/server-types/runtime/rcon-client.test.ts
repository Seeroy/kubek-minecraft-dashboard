import { afterEach, describe, expect, test } from "bun:test";
import { createServer, type Server, type Socket } from "node:net";
import { decodePackets, encodePacket, rconCommand } from "./rcon-client";

let server: Server | null = null;

afterEach(() => {
  server?.close();
  server = null;
});

/** Fake Source RCON server, onCommand decides what happens after the exec packet */
function fakeServer(password: string, onCommand: (socket: Socket, id: number, body: string) => void): Promise<number> {
  return new Promise((resolve) => {
    server = createServer((socket) => {
      let buffer: Buffer = Buffer.alloc(0);
      socket.on("data", (chunk: Buffer) => {
        const decoded = decodePackets(Buffer.concat([buffer, chunk]));
        buffer = decoded.rest;
        for (const p of decoded.packets) {
          if (p.type === 3) {
            socket.write(encodePacket(p.id, 0, ""));
            socket.write(encodePacket(p.body === password ? p.id : -1, 2, ""));
          } else if (p.type === 2) {
            onCommand(socket, p.id, p.body);
          }
        }
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server!.address();
      resolve(typeof address === "object" && address ? address.port : 0);
    });
  });
}

describe("rconCommand", () => {
  test("logs in and returns the reply", async () => {
    const port = await fakeServer("secret", (socket, id, body) => socket.write(encodePacket(id, 0, `ran ${body}`)));
    expect(await rconCommand({ host: "127.0.0.1", port, password: "secret" }, "stop")).toBe("ran stop");
  });

  test("a wrong password fails", async () => {
    const port = await fakeServer("secret", () => {});
    await expect(rconCommand({ host: "127.0.0.1", port, password: "nope" }, "stop")).rejects.toThrow("wrong password");
  });

  test("a server that closes right after the command counts as done", async () => {
    const port = await fakeServer("secret", (socket) => socket.destroy());
    expect(await rconCommand({ host: "127.0.0.1", port, password: "secret" }, "stop")).toBe("");
  });

  test("nobody listening fails fast", async () => {
    await expect(rconCommand({ host: "127.0.0.1", port: 1, password: "x", timeoutMs: 2000 }, "stop")).rejects.toThrow();
  });

  test("packets split across chunks are put back together", () => {
    const packet = encodePacket(7, 0, "hello");
    const first = decodePackets(packet.subarray(0, 6));
    expect(first.packets).toEqual([]);
    const second = decodePackets(Buffer.concat([first.rest, packet.subarray(6)]));
    expect(second.packets).toEqual([{ id: 7, type: 0, body: "hello" }]);
  });
});
