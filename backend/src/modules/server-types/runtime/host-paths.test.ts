import { describe, expect, test } from "bun:test";
import {
  containerIdFromMountinfo,
  mapByHostDataDir,
  mapByMounts,
} from "./host-paths";

describe("mapByHostDataDir", () => {
  test("moves the working dir onto the host dir", () => {
    expect(mapByHostDataDir("/data/servers/abc", "/data", "/opt/kubek")).toBe(
      "/opt/kubek/servers/abc",
    );
    expect(mapByHostDataDir("/data", "/data", "/opt/kubek")).toBe("/opt/kubek");
  });

  test("keeps Windows host dirs in their own syntax", () => {
    expect(
      mapByHostDataDir("/data/servers/abc", "/data", "C:\\kubek\\data"),
    ).toBe("C:\\kubek\\data\\servers\\abc");
  });

  test("ignores paths outside the working dir", () => {
    expect(mapByHostDataDir("/srv/other", "/data", "/opt/kubek")).toBeNull();
    expect(mapByHostDataDir("/database/x", "/data", "/opt/kubek")).toBeNull();
  });
});

describe("mapByMounts", () => {
  const volume = {
    Source: "/var/lib/docker/volumes/kubek-data/_data",
    Destination: "/data",
  };

  test("maps through a named volume", () => {
    expect(mapByMounts("/data/servers/abc", [volume])).toBe(
      "/var/lib/docker/volumes/kubek-data/_data/servers/abc",
    );
  });

  test("the deepest mount wins", () => {
    const servers = {
      Source: "/mnt/fast/servers",
      Destination: "/data/servers",
    };
    expect(mapByMounts("/data/servers/abc", [volume, servers])).toBe(
      "/mnt/fast/servers/abc",
    );
    expect(mapByMounts("/data/backups/x", [volume, servers])).toBe(
      "/var/lib/docker/volumes/kubek-data/_data/backups/x",
    );
  });

  test("a sibling with the same prefix is not a match", () => {
    expect(mapByMounts("/database/abc", [volume])).toBeNull();
  });

  test("null when nothing covers the path", () => {
    expect(mapByMounts("/data/servers/abc", [])).toBeNull();
    expect(
      mapByMounts("/data/servers/abc", [
        { Source: "/var/run/docker.sock", Destination: "/var/run/docker.sock" },
      ]),
    ).toBeNull();
  });
});

describe("containerIdFromMountinfo", () => {
  test("reads the id from the hostname mount", () => {
    const id =
      "9c7f15ab0dd47156b674a72298c29afddd877d7d37966f2cecfc5a60ae70933c";
    const line = `612 600 254:1 /docker/containers/${id}/hostname /etc/hostname rw,relatime - ext4 /dev/vda1 rw`;
    expect(containerIdFromMountinfo(line)).toBe(id);
  });

  test("null outside a container", () => {
    expect(
      containerIdFromMountinfo("22 1 8:1 / / rw - ext4 /dev/sda1 rw"),
    ).toBeNull();
  });

  test("shm mounts the host sees for every container do not count", () => {
    const id = "a".repeat(64);
    const line = `900 30 0:55 / /var/lib/docker/containers/${id}/mounts/shm rw - tmpfs shm rw`;
    expect(containerIdFromMountinfo(line)).toBeNull();
  });
});
