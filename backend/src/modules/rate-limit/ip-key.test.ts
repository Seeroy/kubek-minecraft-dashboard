import { expect, test } from "bun:test";
import { ipKey } from "./ip-key";

test("IPv4 stays as is", () => {
  expect(ipKey("203.0.113.7")).toBe("203.0.113.7");
});

test("addresses of one IPv6 /64 share a key", () => {
  const a = ipKey("2001:db8:aa:1::1");
  expect(ipKey("2001:0db8:00aa:0001:ffff:1:2:3")).toBe(a);
  expect(a).toBe("2001:db8:aa:1::/64");
  expect(ipKey("2001:db8:aa:2::1")).not.toBe(a);
});

test("short and zone forms work", () => {
  expect(ipKey("::1")).toBe("0:0:0:0::/64");
  expect(ipKey("fe80::1%en0")).toBe("fe80:0:0:0::/64");
  expect(ipKey(null)).toBe("?");
});
