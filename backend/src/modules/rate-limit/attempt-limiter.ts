/** Locks a key after repeated failures, every further failure doubles the lock */
export interface BackoffPolicy {
  kind: "backoff";
  freeFailures: number;
  baseLockMs: number;
  maxLockMs: number;
  /** Quiet time after which past failures are forgotten */
  forgetAfterMs: number;
}

/** Caps attempts per fixed window, regardless of outcome */
export interface WindowPolicy {
  kind: "window";
  limit: number;
  windowMs: number;
}

export type LimitPolicy = BackoffPolicy | WindowPolicy;

interface KeyState {
  count: number;
  /** Window start for window policies, last failure for backoff ones */
  since: number;
  lockedUntil: number;
}

export interface FailureResult {
  /** Lock length in ms, 0 while failures are still free */
  lockMs: number;
  /** True when this failure turned an open key into a locked one */
  justLocked: boolean;
}

export class AttemptLimiter {
  private readonly keys = new Map<string, KeyState>();

  constructor(private readonly policy: LimitPolicy) {}

  /** Milliseconds until the key may try again, 0 when allowed */
  retryAfter(key: string, now: number): number {
    const state = this.current(key, now);
    return state ? Math.max(0, state.lockedUntil - now) : 0;
  }

  /** Counts an attempt against a window policy, returns the wait if over the cap */
  hit(key: string, now: number): number {
    const policy = this.expect("window");
    const state = this.current(key, now) ?? this.open(key, now);
    state.count += 1;
    if (state.count > policy.limit)
      state.lockedUntil = state.since + policy.windowMs;
    return Math.max(0, state.lockedUntil - now);
  }

  fail(key: string, now: number): FailureResult {
    const policy = this.expect("backoff");
    const state = this.current(key, now) ?? this.open(key, now);
    const wasLocked = state.lockedUntil > now;
    state.count += 1;
    state.since = now;
    const over = state.count - policy.freeFailures;
    if (over <= 0) return { lockMs: 0, justLocked: false };
    const lockMs = Math.min(
      policy.baseLockMs * 2 ** (over - 1),
      policy.maxLockMs,
    );
    state.lockedUntil = now + lockMs;
    return { lockMs, justLocked: !wasLocked && over === 1 };
  }

  reset(key: string): void {
    this.keys.delete(key);
  }

  prune(now: number): void {
    for (const key of [...this.keys.keys()]) this.current(key, now);
  }

  private current(key: string, now: number): KeyState | null {
    const state = this.keys.get(key);
    if (!state) return null;
    const expiresAt =
      this.policy.kind === "window"
        ? state.since + this.policy.windowMs
        : Math.max(state.lockedUntil, state.since + this.policy.forgetAfterMs);
    if (now >= expiresAt) {
      this.keys.delete(key);
      return null;
    }
    return state;
  }

  private open(key: string, now: number): KeyState {
    const state = { count: 0, since: now, lockedUntil: 0 };
    this.keys.set(key, state);
    return state;
  }

  private expect<K extends LimitPolicy["kind"]>(
    kind: K,
  ): Extract<LimitPolicy, { kind: K }> {
    if (this.policy.kind !== kind) {
      throw new Error(`Limiter expects a ${this.policy.kind} policy`);
    }
    return this.policy as Extract<LimitPolicy, { kind: K }>;
  }
}
