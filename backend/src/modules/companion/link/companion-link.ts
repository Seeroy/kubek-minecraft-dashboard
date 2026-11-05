import type {
  CompanionEvent,
  CompanionHello,
  CompanionStats,
} from "@shared/types/companion.types";
import { FrameDecoder } from "../protocol/frame-decoder";
import type { CompanionMessage } from "../protocol/messages";
import {
  encodeRequest,
  newToken,
  REQUEST_ECHO,
} from "../protocol/request-encoder";

/** A request the panel pushes on its own, like settings after a hello */
export interface CompanionPush {
  type: string;
  fields?: Record<string, unknown>;
}

/** Where a link reports to, implemented by CompanionHubService */
export interface CompanionHub {
  /** Plugin said hello, returns what to send it right away */
  connected(serverId: string, hello: CompanionHello): CompanionPush[];
  stats(serverId: string, stats: CompanionStats): void;
  events(serverId: string, events: CompanionEvent[]): void;
  disconnected(serverId: string): void;
}

export type CompanionErrorCode = "not_connected" | "timeout" | "rejected";

export class CompanionRequestError extends Error {
  constructor(
    readonly code: CompanionErrorCode,
    message: string,
  ) {
    super(message);
  }
}

const DEFAULT_TIMEOUT_MS = 10_000;
// A PTY echo shows up right away, older lines are real output
const ECHO_WINDOW_MS = 5_000;
// Wrapped echo pieces shorter than this could match normal text
const MIN_ECHO_PIECE = 12;

interface Pending {
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * Companion side of one server instance: owns the launch token, cuts frames
 * out of the output and matches replies to requests
 */
export class CompanionLink {
  private token: string | null = null;
  private hello: CompanionHello | null = null;
  private readonly decoder = new FrameDecoder(() => this.token);
  private readonly pending = new Map<string, Pending>();
  private sent: { line: string; at: number }[] = [];

  constructor(
    private readonly serverId: string,
    private readonly hub: CompanionHub,
    // Writes a line to the server stdin, false when it's not running
    private readonly write: (line: string) => boolean,
  ) {}

  get connected(): boolean {
    return this.hello !== null;
  }

  get info(): CompanionHello | null {
    return this.hello;
  }

  /** Fresh token for a new launch, goes into KUBEK_COMPANION_TOKEN */
  issueToken(): string {
    this.detach();
    this.decoder.reset();
    this.token = newToken();
    return this.token;
  }

  /** Token of a container that kept running while the panel was down */
  restoreToken(token: string | undefined): void {
    this.detach();
    this.decoder.reset();
    this.token = token ?? null;
  }

  /** Raw output in, console text out */
  filter(chunk: string): string {
    const { text, messages } = this.decoder.feed(chunk);
    for (const message of messages) this.handle(message);
    return text;
  }

  /** Our own request coming back as console output */
  isEcho(line: string): boolean {
    const trimmed = line.trim();
    if (REQUEST_ECHO.test(trimmed)) return true;
    if (trimmed.length < MIN_ECHO_PIECE || this.sent.length === 0) return false;
    const now = Date.now();
    this.sent = this.sent.filter((s) => now - s.at < ECHO_WINDOW_MS);
    return this.sent.some((s) => s.line.includes(trimmed));
  }

  /** Sends a request and waits for the plugin's result */
  request<T = unknown>(
    type: string,
    fields: Record<string, unknown> = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ): Promise<T> {
    return this.start<T>(type, fields, timeoutMs).result;
  }

  /** Like request, but the id is known before the reply, for events tied to it */
  start<T = unknown>(
    type: string,
    fields: Record<string, unknown> = {},
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ): { id: string; result: Promise<T> } {
    if (!this.token || !this.connected) {
      const error = new CompanionRequestError(
        "not_connected",
        "Companion is not connected",
      );
      return { id: "", result: Promise.reject(error) };
    }
    const { id, line } = encodeRequest(this.token, type, fields);
    const result = new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new CompanionRequestError("timeout", `No reply to ${type}`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (data) => resolve(data as T),
        reject,
        timer,
      });
      if (!this.send(line)) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(
          new CompanionRequestError("not_connected", "Server is not running"),
        );
      }
    });
    return { id, result };
  }

  /** Fire and forget, the reply is not interesting */
  push(type: string, fields: Record<string, unknown> = {}): void {
    if (!this.token) return;
    this.send(encodeRequest(this.token, type, fields).line);
  }

  /** Ask the plugin to introduce itself again, after an adopt */
  ping(): void {
    this.push("hello");
  }

  /** Process is gone or about to go */
  detach(): void {
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new CompanionRequestError("not_connected", "Server stopped"));
    }
    this.pending.clear();
    this.sent = [];
    if (this.hello) {
      this.hello = null;
      this.hub.disconnected(this.serverId);
    }
  }

  private send(line: string): boolean {
    this.sent.push({ line, at: Date.now() });
    return this.write(line);
  }

  private handle(message: CompanionMessage): void {
    switch (message.t) {
      case "hello":
        this.hello = omit(message, "t", "ts");
        for (const push of this.hub.connected(this.serverId, this.hello)) {
          this.push(push.type, push.fields);
        }
        break;
      case "stats":
        // A reload or adopt can skip the hello, ask for it
        if (!this.hello) this.ping();
        this.hub.stats(this.serverId, omit(message, "t"));
        break;
      case "events":
        this.hub.events(this.serverId, message.items ?? []);
        break;
      case "result": {
        const pending = this.pending.get(message.id);
        if (!pending) return;
        clearTimeout(pending.timer);
        this.pending.delete(message.id);
        if (message.ok) pending.resolve(message.data);
        else {
          pending.reject(
            new CompanionRequestError("rejected", message.error ?? "rejected"),
          );
        }
        break;
      }
      case "stopping":
        this.detach();
        break;
      case "ready":
        break;
    }
  }
}

function omit<T extends object, K extends keyof T>(
  value: T,
  ...keys: K[]
): Omit<T, K> {
  const copy = { ...value };
  for (const key of keys) delete copy[key];
  return copy;
}
