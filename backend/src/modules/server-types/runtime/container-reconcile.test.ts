import { describe, expect, test } from "bun:test";
import {
  containerLabels,
  type ContainerRow,
  reconcileContainers,
} from "./container-reconcile";

const PANEL = "panel-1";
const dirs = new Map([
  ["abc", "/opt/kubek/servers/abc"],
  ["def", "/opt/kubek/servers/def"],
]);

function row(over: Partial<ContainerRow> & { id: string }): ContainerRow {
  return {
    names: [`/kubek-abc`],
    state: "running",
    labels: containerLabels("abc", PANEL),
    mounts: [{ Source: "/opt/kubek/servers/abc", Destination: "/data" }],
    ...over,
  };
}

describe("reconcileContainers", () => {
  test("adopts our running container", () => {
    expect(reconcileContainers([row({ id: "c1" })], PANEL, dirs)).toEqual([
      { kind: "adopt", serverId: "abc", containerId: "c1" },
    ]);
  });

  test("removes our stopped container", () => {
    for (const state of ["exited", "created", "dead"]) {
      expect(
        reconcileContainers([row({ id: "c1", state })], PANEL, dirs),
      ).toEqual([{ kind: "remove", serverId: "abc", containerId: "c1" }]);
    }
  });

  test("leaves paused and restarting containers alone", () => {
    const actions = reconcileContainers(
      [row({ id: "c1", state: "paused" })],
      PANEL,
      dirs,
    );
    expect(actions[0].kind).toBe("skip");
  });

  test("ignores containers of another panel", () => {
    const other = row({ id: "c1", labels: containerLabels("abc", "panel-2") });
    expect(reconcileContainers([other], PANEL, dirs)).toEqual([]);
  });

  test("ignores foreign containers that only look like ours", () => {
    const rows = [
      row({ id: "c1", names: ["/my-kubek-db"], labels: {} }),
      row({ id: "c2", names: ["/kubek"], labels: {} }),
      row({ id: "c3", names: ["/kubek-kubek-1"], labels: {} }),
      row({ id: "c4", names: ["/kubek-unknown"], labels: {} }),
      row({ id: "c5", labels: { "kubek.managed": "false" } }),
    ];
    expect(reconcileContainers(rows, PANEL, dirs)).toEqual([]);
  });

  test("a label with a foreign name is not ours", () => {
    const renamed = row({ id: "c1", names: ["/something-else"] });
    expect(reconcileContainers([renamed], PANEL, dirs)).toEqual([]);
  });

  test("handles unlabeled containers of older panels by exact name", () => {
    const rows = [
      row({ id: "c1", labels: {} }),
      row({
        id: "c2",
        names: ["/kubek-def"],
        labels: {},
        state: "exited",
        mounts: [{ Source: "/opt/kubek/servers/def", Destination: "/data" }],
      }),
    ];
    expect(reconcileContainers(rows, PANEL, dirs)).toEqual([
      { kind: "adopt", serverId: "abc", containerId: "c1" },
      { kind: "remove", serverId: "def", containerId: "c2" },
    ]);
  });

  test("skips a container whose data lives somewhere else", () => {
    const copy = row({
      id: "c1",
      mounts: [{ Source: "/home/dev/copy/servers/abc", Destination: "/data" }],
    });
    const stopped = { ...copy, id: "c2", state: "exited" };
    const actions = reconcileContainers([copy, stopped], PANEL, dirs);
    expect(actions.map((a) => a.kind)).toEqual(["skip", "skip"]);
  });

  test("the dir label wins over mounts the daemon reports differently", () => {
    const labels = containerLabels("abc", PANEL, "/opt/kubek/servers/abc");
    const desktop = row({
      id: "c1",
      labels,
      mounts: [
        { Source: "/run/desktop/mnt/host/opt/kubek", Destination: "/data" },
      ],
    });
    expect(reconcileContainers([desktop], PANEL, dirs)[0].kind).toBe("adopt");

    const moved = row({
      id: "c2",
      labels: containerLabels("abc", PANEL, "/elsewhere/servers/abc"),
    });
    expect(reconcileContainers([moved], PANEL, dirs)[0].kind).toBe("skip");
  });

  test("a deleted server keeps its running container, a stopped one goes", () => {
    const labels = containerLabels("gone", PANEL);
    const rows = [
      row({ id: "c1", names: ["/kubek-gone"], labels }),
      row({ id: "c2", names: ["/kubek-gone"], labels, state: "exited" }),
    ];
    expect(reconcileContainers(rows, PANEL, dirs).map((a) => a.kind)).toEqual([
      "skip",
      "remove",
    ]);
  });

  test("an unlabeled container of an unknown server is never removed", () => {
    const rows = [
      row({ id: "c1", names: ["/kubek-gone"], labels: {}, state: "exited" }),
    ];
    expect(reconcileContainers(rows, PANEL, dirs)).toEqual([]);
  });
});
