import { describe, expect, it } from "bun:test";
import type { IAssistantConversation } from "@shared/types/assistant.types";
import type { IUser } from "@shared/types/user.types";
import type { StoredToolCall } from "../conversations/messages.repository";
import { AgentRunnerService } from "./agent-runner.service";

const user = { id: "u", username: "steve", isAdmin: false } as IUser;
const conversation: IAssistantConversation = {
  id: "c",
  title: "t",
  serverId: null,
  createdAt: 0,
  updatedAt: 0,
};
const call = (id: string) => ({ id }) as StoredToolCall;
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(blockFirstRun = true) {
  const log: string[] = [];
  let release = () => {};
  const blocked = new Promise<void>((resolve) => (release = resolve));
  const runner = new AgentRunnerService(
    {} as never,
    {} as never,
    {
      get: () => ({ model: "m", temperature: 0, maxSteps: 8 }),
    } as never,
    { findById: () => null } as never,
    { emitToRoom: () => {} } as never,
    {
      resolve: () =>
        Promise.resolve({
          kind: "generic",
          vision: null,
          reasoning: null,
          reasoningMandatory: false,
          webSearch: false,
        }),
    } as never,
    { emit: () => {} } as never,
  );
  let runs = 0;
  // Only the loop is faked, the queueing around it is what is tested
  (runner as unknown as { loop: unknown }).loop = {
    run: async () => {
      log.push("run");
      if (blockFirstRun && runs++ === 0) await blocked;
    },
    decide: (_run: unknown, stored: StoredToolCall, approve: boolean) => {
      log.push(`decide:${stored.id}:${approve}`);
      return Promise.resolve();
    },
  };
  return { runner, log, release };
}

describe("AgentRunnerService", () => {
  it("queues a decision behind the run still in flight", async () => {
    const { runner, log, release } = setup();
    runner.start(user, conversation, {});
    await tick();
    runner.decide(user, conversation, call("a"), true, {});
    runner.decide(user, conversation, call("b"), false, {});

    expect(runner.isRunning("c")).toBe(true);
    expect(runner.isDecided("a")).toBe(true);
    expect(log).toEqual(["run"]);

    release();
    for (let i = 0; i < 5; i++) await tick();
    expect(log).toEqual([
      "run",
      "decide:a:true",
      "run",
      "decide:b:false",
      "run",
    ]);
    expect(runner.isDecided("a")).toBe(false);
    expect(runner.isRunning("c")).toBe(false);
  });

  it("decides right away when nothing runs", async () => {
    const { runner, log } = setup(false);
    runner.decide(user, conversation, call("a"), true, {});
    await tick();
    expect(log).toEqual(["decide:a:true", "run"]);
  });
});
