import { describe, expect, test } from "bun:test";
import type { IServerRuntime } from "@/modules/server-types/runtime/runtime.interface";
import { fake } from "@/testing/fake";
import type { IInstanceLog } from "@shared/types/server/instance.types";
import { InstanceConsole } from "./instance-console";

function makeConsole() {
  const entries: IInstanceLog[] = [];
  const lines: string[] = [];
  const con = new InstanceConsole(
    (entry) => entries.push(entry),
    (line) => lines.push(line),
  );
  return { con, entries, lines };
}

describe("InstanceConsole", () => {
  test("finished lines are logged as shown and passed on as plain text", () => {
    const { con, entries, lines } = makeConsole();

    con.feed("\u001b[32mhello\u001b[0m\nwor");
    expect(lines).toEqual(["hello"]);
    expect(entries.map((e) => e.line)).toEqual(["\u001b[32mhello\u001b[0m"]);

    con.feed("ld\n");
    expect(lines).toEqual(["hello", "world"]);
  });

  test("close flushes the half line", () => {
    const { con, lines } = makeConsole();
    con.feed("last words");
    expect(lines).toEqual([]);

    con.close();
    expect(lines).toEqual(["last words"]);
  });

  test("replayed history goes to the log only", () => {
    const { con, entries, lines } = makeConsole();

    const replayed = con.replay("\u001b[1mDone\u001b[0m\r\n\n  \nmore\n");

    expect(replayed).toEqual(["Done", "more"]);
    expect(entries).toHaveLength(2);
    expect(lines).toEqual([]);
  });

  test("input goes to stdin without a terminal", async () => {
    const { con } = makeConsole();
    const sent: string[] = [];
    const runtime = fake<IServerRuntime>({
      writeStdin: (data) => {
        sent.push(data);
        return true;
      },
    });

    con.attach(runtime);
    con.send(runtime, "list");

    expect(sent).toEqual(["list"]);
    expect(await con.complete("li")).toEqual({
      completion: "li",
      candidates: [],
    });
  });
});
