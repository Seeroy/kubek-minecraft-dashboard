import { getErrorMessage } from "@/core/utils/error";
import { Injectable, Logger } from "@nestjs/common";

interface RateSource {
  url: string;
  read(body: unknown): unknown;
}

// Tried in order, all keyless and updated daily
const SOURCES: RateSource[] = [
  {
    url: "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.min.json",
    read: (body) => (body as { usd?: { rub?: unknown } }).usd?.rub,
  },
  {
    url: "https://latest.currency-api.pages.dev/v1/currencies/usd.min.json",
    read: (body) => (body as { usd?: { rub?: unknown } }).usd?.rub,
  },
  {
    url: "https://open.er-api.com/v6/latest/USD",
    read: (body) => (body as { rates?: { RUB?: unknown } }).rates?.RUB,
  },
];

const FRESH_MS = 6 * 60 * 60_000;
// A failed round is not retried on every status request
const RETRY_MS = 30 * 60_000;
const TIMEOUT_MS = 4_000;

type Fetch = (input: string, init: RequestInit) => Promise<Response>;

/** Rubles per dollar, only used to show assistant costs */
@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private rate: number | null = null;
  private nextCheckAt = 0;
  private pending: Promise<void> | null = null;
  // Swapped in tests, Nest would try to inject a constructor argument
  fetchImpl: Fetch = fetch;

  async usdRub(): Promise<number | null> {
    if (Date.now() >= this.nextCheckAt) {
      this.pending ??= this.refresh().finally(() => (this.pending = null));
      await this.pending;
    }
    return this.rate;
  }

  private async refresh(): Promise<void> {
    const errors: string[] = [];
    for (const source of SOURCES) {
      try {
        const res = await this.fetchImpl(source.url, {
          signal: AbortSignal.timeout(TIMEOUT_MS),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const value = source.read(await res.json());
        if (typeof value !== "number" || !(value > 0))
          throw new Error("no RUB rate in the response");
        this.rate = value;
        this.nextCheckAt = Date.now() + FRESH_MS;
        return;
      } catch (err) {
        errors.push(`${new URL(source.url).host}: ${getErrorMessage(err)}`);
      }
    }
    // The last known rate stays, a stale rate beats none
    this.nextCheckAt = Date.now() + RETRY_MS;
    this.logger.warn(`USD rate unavailable (${errors.join("; ")})`);
  }
}
