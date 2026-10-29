import type { KubekBlueprintManifest } from "@kubekpanel/blueprint-sdk";
import { describe, expect, test } from "bun:test";
import { containerMemoryBytes } from "./docker.runtime";
import { buildPortBindings, publishHostIp } from "./port-bindings";

describe("publishHostIp", () => {
  const network = { proxyServerId: "proxy" };

  test("a server outside a network listens everywhere", () => {
    expect(publishHostIp("abc", null, undefined)).toBeUndefined();
  });

  test("the proxy itself listens everywhere", () => {
    expect(publishHostIp("proxy", network, "docker")).toBeUndefined();
    expect(publishHostIp("proxy", network, "native")).toBeUndefined();
  });

  test("a backend behind a native proxy is loopback only", () => {
    expect(publishHostIp("abc", network, "native")).toBe("127.0.0.1");
    expect(publishHostIp("abc", network, undefined)).toBe("127.0.0.1");
  });

  test("a backend behind a container proxy stays reachable from the bridge", () => {
    expect(publishHostIp("abc", network, "docker")).toBeUndefined();
  });
});

describe("buildPortBindings", () => {
  const ports: KubekBlueprintManifest["ports"] = [
    { key: "SERVER_PORT", default: 25565, protocol: "tcp" },
    { key: "VOICE_PORT", default: 24454, protocol: "tcp+udp" },
  ];

  test("publishes 1:1 on every interface by default", () => {
    expect(buildPortBindings(ports, { SERVER_PORT: 25570 })).toEqual({
      "25570/tcp": [{ HostPort: "25570" }],
      "24454/tcp": [{ HostPort: "24454" }],
      "24454/udp": [{ HostPort: "24454" }],
    });
  });

  test("pins the host address when asked", () => {
    expect(buildPortBindings(ports, {}, "127.0.0.1")["25565/tcp"]).toEqual([
      { HostIp: "127.0.0.1", HostPort: "25565" },
    ]);
  });
});

describe("containerMemoryBytes", () => {
  const MB = 1024 * 1024;

  test("no limit without a heap size", () => {
    expect(containerMemoryBytes(undefined)).toBeUndefined();
    expect(containerMemoryBytes(0)).toBeUndefined();
    expect(containerMemoryBytes(Number.NaN)).toBeUndefined();
  });

  test("small heaps get at least a gigabyte on top", () => {
    expect(containerMemoryBytes(1024)).toBe(2048 * MB);
  });

  test("large heaps get a quarter on top", () => {
    expect(containerMemoryBytes(8192)).toBe(10240 * MB);
  });
});
