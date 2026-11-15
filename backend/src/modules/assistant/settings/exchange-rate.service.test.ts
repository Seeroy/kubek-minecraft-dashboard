import { describe, expect, it } from "bun:test";
import { ExchangeRateService } from "./exchange-rate.service";

const json = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body)));

describe("ExchangeRateService", () => {
  it("falls through to the next source", async () => {
    const hosts: string[] = [];
    const rates = new ExchangeRateService();
    rates.fetchImpl = (url) => {
      hosts.push(new URL(url).host);
      if (hosts.length === 1) return Promise.reject(new Error("blocked"));
      return json({ usd: { rub: 82.5 } });
    };
    expect(await rates.usdRub()).toBe(82.5);
    expect(hosts).toEqual([
      "cdn.jsdelivr.net",
      "latest.currency-api.pages.dev",
    ]);
  });

  it("reads the open.er-api shape and caches the result", async () => {
    let calls = 0;
    const rates = new ExchangeRateService();
    rates.fetchImpl = (url) => {
      calls++;
      if (!url.includes("er-api"))
        return Promise.resolve(new Response("", { status: 503 }));
      return json({ rates: { RUB: 81 } });
    };
    expect(await rates.usdRub()).toBe(81);
    expect(await rates.usdRub()).toBe(81);
    expect(calls).toBe(3);
  });

  it("gives null when every source fails", async () => {
    const rates = new ExchangeRateService();
    rates.fetchImpl = () => json({});
    expect(await rates.usdRub()).toBeNull();
  });
});
