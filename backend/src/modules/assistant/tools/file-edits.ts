import { REDACTED } from "../runner/redact";

export interface FileEdit {
  find: string;
  replace: string;
}

export type EditOutcome =
  { ok: true; text: string } | { ok: false; error: string };

/** Applies find and replace edits in order, each find must match exactly once */
export function applyEdits(source: string, edits: FileEdit[]): EditOutcome {
  let text = source;
  for (const [i, edit] of edits.entries()) {
    const first = text.indexOf(edit.find);
    if (first < 0) {
      return {
        ok: false,
        error: `Edit ${i + 1}: text to find is not in the file`,
      };
    }
    if (text.indexOf(edit.find, first + 1) >= 0) {
      return {
        ok: false,
        error: `Edit ${i + 1}: text to find matches more than once, add surrounding lines`,
      };
    }
    text =
      text.slice(0, first) +
      edit.replace +
      text.slice(first + edit.find.length);
  }
  return { ok: true, text };
}

/** Output shown to the model is redacted, writing the marker back would destroy the secret */
export function containsRedaction(value: string): boolean {
  return value.includes(REDACTED);
}

export function looksBinary(buffer: Buffer): boolean {
  return buffer.subarray(0, 8000).includes(0);
}
