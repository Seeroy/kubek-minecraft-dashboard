import type {
  BackendForwardingKind,
  ForwardingMode,
} from "@shared/types/network.types";

/** Read access to one server folder, null for a missing file */
export interface ServerFiles {
  read(path: string): Promise<string | null>;
}

export interface FileEdit {
  path: string;
  before: string | null;
  after: string;
}

export interface ForwardingInput {
  mode: ForwardingMode;
  secret: string;
  gameVersion?: string;
}

/** How one family of backends is told to trust the proxy */
export interface BackendForwarding {
  readonly kind: BackendForwardingKind;
  modes(gameVersion?: string): ForwardingMode[];
  edits(files: ServerFiles, input: ForwardingInput): Promise<FileEdit[]>;
}

/** Edit of a file only when its text really changes */
export function editOf(
  path: string,
  before: string | null,
  after: string,
): FileEdit[] {
  return before === after ? [] : [{ path, before, after }];
}

function parts(version: string): number[] | null {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?/.exec(version.trim());
  return match
    ? [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)]
    : null;
}

/** True when a known release is older than the given one, unknown versions count as new */
export function isBefore(version: string | undefined, than: string): boolean {
  const a = version ? parts(version) : null;
  const b = parts(than);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] < b[i];
  }
  return false;
}
