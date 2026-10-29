import type { LimitPolicy } from "./attempt-limiter";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

const failures = (freeFailures: number): LimitPolicy => ({
  kind: "backoff",
  freeFailures,
  baseLockMs: MINUTE,
  maxLockMs: HOUR,
  forgetAfterMs: HOUR,
});

export const RATE_LIMIT_POLICIES = {
  /** Wrong password for one username from one address */
  login: failures(5),
  /** Wrong passwords for one username from anywhere, short locks keep a lockout cheap */
  "login.user": {
    kind: "backoff",
    freeFailures: 20,
    baseLockMs: MINUTE,
    maxLockMs: 15 * MINUTE,
    forgetAfterMs: HOUR,
  },
  /** Every login attempt from one address */
  "login.ip": { kind: "window", limit: 30, windowMs: MINUTE },
  /** Wrong TOTP codes for one account across all challenges */
  totp: failures(5),
  /** Each switch sends a new Telegram prompt */
  "challenge.switch": { kind: "window", limit: 3, windowMs: 10 * MINUTE },
  "challenge.switch.ip": { kind: "window", limit: 10, windowMs: MINUTE },
  /** Password re-checks of a signed in user */
  password: failures(5),
  "password.attempts": { kind: "window", limit: 10, windowMs: MINUTE },
  /** Telegram linking codes, per account or per Telegram user */
  "telegram.otp": failures(5),
  /** Assistant messages of one user, each one costs provider tokens */
  assistant: { kind: "window", limit: 40, windowMs: 10 * MINUTE },
} satisfies Record<string, LimitPolicy>;

export type RateLimitPolicy = keyof typeof RATE_LIMIT_POLICIES;
