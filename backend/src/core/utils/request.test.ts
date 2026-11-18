import { describe, expect, test } from "bun:test";
import {
  isCloudflareIp,
  parseHops,
  resolveClientIp,
  type ProxyTrust,
} from "./request";

const CF = "172.71.218.237";
const TRAEFIK = "10.0.1.4";
const CLIENT = "203.0.113.9";

function req(remoteAddress: string, headers: Record<string, string> = {}) {
  return { headers, socket: { remoteAddress } };
}

const direct: ProxyTrust = { hops: 0, cloudflare: false };
const oneProxy: ProxyTrust = { hops: 1, cloudflare: false };

describe("parseHops", () => {
  test("flags and numbers", () => {
    expect(parseHops(undefined)).toBe(0);
    expect(parseHops("")).toBe(0);
    expect(parseHops("yes")).toBe(1);
    expect(parseHops("TRUE")).toBe(1);
    expect(parseHops("2")).toBe(2);
    expect(parseHops("-1")).toBe(0);
    expect(parseHops("abc")).toBe(0);
  });
});

describe("isCloudflareIp", () => {
  test("matches v4 and v6 ranges", () => {
    expect(isCloudflareIp(CF)).toBe(true);
    expect(isCloudflareIp("2606:4700::6810:84e5")).toBe(true);
    expect(isCloudflareIp(CLIENT)).toBe(false);
    expect(isCloudflareIp(TRAEFIK)).toBe(false);
  });
});

describe("resolveClientIp", () => {
  test("socket address without trusted proxies", () => {
    const request = req(`::ffff:${CLIENT}`, { "x-forwarded-for": "1.2.3.4" });
    expect(resolveClientIp(request, direct)).toBe(CLIENT);
  });

  test("takes the entry our proxy appended", () => {
    const request = req(TRAEFIK, { "x-forwarded-for": `1.2.3.4, ${CLIENT}` });
    expect(resolveClientIp(request, oneProxy)).toBe(CLIENT);
  });

  test("two hops skip the outer proxy", () => {
    const request = req(TRAEFIK, {
      "x-forwarded-for": `1.2.3.4, ${CLIENT}, ${CF}`,
    });
    expect(resolveClientIp(request, { hops: 2, cloudflare: false })).toBe(
      CLIENT,
    );
  });

  test("cloudflare behind a proxy uses CF-Connecting-IP", () => {
    const request = req(TRAEFIK, {
      "x-forwarded-for": CF,
      "cf-connecting-ip": CLIENT,
    });
    expect(resolveClientIp(request, { hops: 1, cloudflare: true })).toBe(
      CLIENT,
    );
  });

  test("cloudflare straight to Kubek", () => {
    const request = req(CF, { "cf-connecting-ip": CLIENT });
    expect(resolveClientIp(request, { hops: 0, cloudflare: true })).toBe(
      CLIENT,
    );
  });

  test("CF-Connecting-IP is ignored when the peer is not Cloudflare", () => {
    const request = req(TRAEFIK, {
      "x-forwarded-for": "198.51.100.7",
      "cf-connecting-ip": "192.168.1.42",
    });
    expect(resolveClientIp(request, { hops: 1, cloudflare: true })).toBe(
      "198.51.100.7",
    );
  });

  test("CF-Connecting-IP is ignored when the flag is off", () => {
    const request = req(TRAEFIK, {
      "x-forwarded-for": CF,
      "cf-connecting-ip": CLIENT,
    });
    expect(resolveClientIp(request, oneProxy)).toBe(CF);
  });

  test("garbage CF-Connecting-IP falls back to the peer", () => {
    const request = req(CF, { "cf-connecting-ip": "not-an-ip" });
    expect(resolveClientIp(request, { hops: 0, cloudflare: true })).toBe(CF);
  });
});
