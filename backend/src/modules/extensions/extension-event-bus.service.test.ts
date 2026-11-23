import { describe, expect, mock, test } from "bun:test";
import { AppEventsService } from "@/core/events/app-events.service";
import type { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { ServerEventsService } from "@/ws/services/server-events.service";
import type { ServerBroadcastService } from "@/ws/services/server-broadcast.service";
import { ServerStatus } from "@shared/types/server/server.types";
import { ExtensionEventBus } from "./extension-event-bus.service";

function setup() {
  const servers = { findById: () => ({ id: "s1", name: "Survival" }) } as unknown as ServersRepository;
  const events = new AppEventsService();
  const bus = new ExtensionEventBus(servers, events);
  const broadcast = { emitServerStatusUpdate: mock() } as unknown as ServerBroadcastService;
  const serverEvents = new ServerEventsService(broadcast, servers, bus, events);
  return { bus, events, serverEvents };
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("server events for extensions", () => {
  test("started when the process starts, running when it is up", async () => {
    const { bus, serverEvents } = setup();
    const seen: string[] = [];
    bus.on("server.started", () => seen.push("started"));
    bus.on("server.running", () => seen.push("running"));
    serverEvents.emitServerStatus("s1", { status: ServerStatus.STARTING });
    serverEvents.emitServerStatus("s1", { status: ServerStatus.RUNNING });
    await flush();
    expect(seen).toEqual(["started", "running"]);
  });

  test("a deleted server reaches extensions", async () => {
    const { bus, events } = setup();
    const seen: unknown[] = [];
    bus.on("server.deleted", (p) => seen.push(p));
    events.emit("server.deleted", { serverId: "s1" });
    await flush();
    expect(seen).toEqual([{ serverId: "s1" }]);
  });

  test("a created server carries its name and blueprint", async () => {
    const { bus, serverEvents } = setup();
    const seen: unknown[] = [];
    bus.on("server.created", (p) => seen.push(p));
    serverEvents.emitServerCreated({ id: "s1", name: "Survival", blueprintId: "paper" } as never);
    await flush();
    expect(seen).toEqual([
      { serverId: "s1", name: "Survival", blueprintId: "paper", serverName: "Survival" },
    ]);
  });
});

describe("handler isolation", () => {
  test("a throwing handler neither breaks the publisher nor the other handlers", async () => {
    const { bus } = setup();
    const seen: string[] = [];
    bus.on("task.created", () => {
      throw new Error("boom");
    }, "com.bad.ext");
    bus.on("task.created", () => Promise.reject(new Error("async boom")));
    bus.on("task.created", (p) => seen.push(p.taskId));
    expect(() => bus.publish("task.created", { taskId: "t1", type: "x" })).not.toThrow();
    await flush();
    expect(seen).toEqual(["t1"]);
  });

  test("handlers run after the publisher returns", () => {
    const { bus } = setup();
    const seen: string[] = [];
    bus.on("task.created", () => seen.push("handler"));
    bus.publish("task.created", { taskId: "t1", type: "x" });
    seen.push("publisher");
    expect(seen).toEqual(["publisher"]);
  });

  test("custom events are isolated too", async () => {
    const { bus } = setup();
    const seen: unknown[] = [];
    bus.onCustom("ext.a.ping", () => {
      throw new Error("boom");
    });
    bus.onCustom("ext.a.ping", (p) => seen.push(p));
    expect(() => bus.emitCustom("ext.a.ping", 1)).not.toThrow();
    await flush();
    expect(seen).toEqual([1]);
  });

  test("unsubscribe stops delivery", async () => {
    const { bus } = setup();
    const seen: unknown[] = [];
    const off = bus.on("task.created", (p) => seen.push(p));
    off();
    bus.publish("task.created", { taskId: "t1", type: "x" });
    await flush();
    expect(seen).toEqual([]);
  });
});

describe("player events from the companion", () => {
  test("join and quit become player.joined and player.left", async () => {
    const { bus, events } = setup();
    const seen: string[] = [];
    bus.on("player.joined", (p) => seen.push(`joined ${p.serverId} ${p.player}`));
    bus.on("player.left", (p) => seen.push(`left ${p.serverId} ${p.player}`));
    events.emit("companion.events", {
      serverId: "s1",
      events: [
        { type: "join", ts: 1, name: "Steve" },
        { type: "chat", ts: 2, name: "Steve", message: "hi" },
        { type: "kick", ts: 3, name: "Steve" },
        { type: "quit", ts: 3, name: "Steve", kicked: true },
      ],
    });
    await flush();
    expect(seen).toEqual(["joined s1 Steve", "left s1 Steve"]);
  });
});
