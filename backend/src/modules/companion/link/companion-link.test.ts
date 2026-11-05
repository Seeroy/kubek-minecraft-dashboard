import { beforeEach, describe, expect, test } from "bun:test";
import { sign } from "../protocol/signature";
import {
  CompanionLink,
  CompanionRequestError,
  type CompanionHub,
} from "./companion-link";

const hello = {
  protocol: 1,
  plugin: "1.0.0",
  server: { name: "Paper", version: "x", bukkitVersion: "x", onlineMode: true },
  java: { version: "21", vendor: "x", vm: "x" },
  caps: {
    tps: "PAPER",
    mspt: "EVENTS",
    folia: false,
    ping: true,
    tileCounters: true,
    bossBar: true,
  },
  settings: { intervalSec: 15, coords: false, chat: false },
};

let written: string[];
let hubCalls: string[];
let link: CompanionLink;
let token: string;

function frame(payload: object): string {
  const json = JSON.stringify(payload);
  return `\u001b]7768;kc1;1;0;1;${sign(token, json)};${json}\u0007\n`;
}

// Rejection reason of a promise, null when it resolved
const caught = (p: Promise<unknown>) =>
  p.then(
    () => null,
    (e: unknown) => e,
  );

function decode(line: string): Record<string, unknown> {
  const encoded = line.split(" ")[2];
  return JSON.parse(Buffer.from(encoded, "base64url").toString()) as Record<
    string,
    unknown
  >;
}

beforeEach(() => {
  written = [];
  hubCalls = [];
  const hub: CompanionHub = {
    connected: () => {
      hubCalls.push("connected");
      return [{ type: "config", fields: { chat: true } }];
    },
    stats: () => hubCalls.push("stats"),
    events: () => hubCalls.push("events"),
    disconnected: () => hubCalls.push("disconnected"),
  };
  link = new CompanionLink("srv", hub, (line) => {
    written.push(line);
    return true;
  });
  token = link.issueToken();
});

describe("CompanionLink", () => {
  test("hello connects and pushes the settings", () => {
    link.filter(frame({ t: "hello", ts: 1, ...hello }));
    expect(link.connected).toBe(true);
    expect(link.info?.plugin).toBe("1.0.0");
    expect(hubCalls).toEqual(["connected"]);
    expect(decode(written[0])).toMatchObject({ t: "config", chat: true });
  });

  test("requests resolve with the plugin's result", async () => {
    link.filter(frame({ t: "hello", ts: 1, ...hello }));
    const reply = link.request("plugins");
    const id = decode(written.at(-1)!).id;
    link.filter(frame({ t: "result", id, ok: true, data: [{ name: "X" }] }));
    expect(await reply).toEqual([{ name: "X" }]);
  });

  test("a refused request rejects with its error", async () => {
    link.filter(frame({ t: "hello", ts: 1, ...hello }));
    const reply = link.request("nope");
    const id = decode(written.at(-1)!).id;
    link.filter(frame({ t: "result", id, ok: false, error: "unknown_type" }));
    expect(await caught(reply)).toMatchObject({
      code: "rejected",
      message: "unknown_type",
    });
  });

  test("requests time out", async () => {
    link.filter(frame({ t: "hello", ts: 1, ...hello }));
    expect(await caught(link.request("plugins", {}, 10))).toBeInstanceOf(
      CompanionRequestError,
    );
  });

  test("nothing is sent before a hello", async () => {
    expect(await caught(link.request("plugins"))).toMatchObject({
      code: "not_connected",
    });
    expect(written).toEqual([]);
  });

  test("stopping and detach reject what is pending", async () => {
    link.filter(frame({ t: "hello", ts: 1, ...hello }));
    const reply = link.request("plugins");
    link.filter(frame({ t: "stopping", ts: 2 }));
    expect(await caught(reply)).toMatchObject({ code: "not_connected" });
    expect(link.connected).toBe(false);
    expect(hubCalls).toContain("disconnected");
  });

  test("stats without a hello ask for one", () => {
    link.filter(frame({ t: "stats", ts: 1 }));
    expect(hubCalls).toEqual(["stats"]);
    expect(decode(written[0]).t).toBe("hello");
  });

  test("a new token drops frames signed with the old one", () => {
    const old = frame({ t: "hello", ts: 1, ...hello });
    link.issueToken();
    link.filter(old);
    expect(link.connected).toBe(false);
  });

  test("spots its own requests echoed back, even wrapped", () => {
    link.push("broadcast", { message: "x".repeat(300) });
    const line = written[0];
    expect(link.isEcho(line)).toBe(true);
    expect(link.isEcho(line.slice(200))).toBe(true);
    expect(link.isEcho("[12:00:00 INFO]: Done (3.2s)!")).toBe(false);
  });
});
