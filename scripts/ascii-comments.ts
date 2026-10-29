import type { BunPlugin } from "bun";

// Comments the bundler keeps in its output
const KEPT_COMMENT = /\/\*[!*][\s\S]*?\*\/|\/\/[#@!][^\n]*/g;
// Without the u flag a match is one UTF-16 unit, surrogate pairs come out as two escapes
const NON_ASCII = /[^\x00-\x7f]/g;

const escape = (unit: string) =>
  `\\u${unit.charCodeAt(0).toString(16).padStart(4, "0")}`;

/**
 * Escapes non ASCII characters inside kept comments. Bun prints strings as
 * ASCII already, but one stray character in a license comment makes the
 * compiled binary store the whole bundle as UTF-16. Inside a string literal
 * the escape means the same character, so matches there change nothing
 */
export function asciiComments(source: string): string {
  if (!/[^\x00-\x7f]/.test(source)) return source;
  return source.replace(KEPT_COMMENT, (comment) =>
    comment.replace(NON_ASCII, escape),
  );
}

export const asciiCommentsPlugin: BunPlugin = {
  name: "ascii-comments",
  setup(build) {
    build.onLoad({ filter: /\.[cm]?js$/ }, async ({ path }) => ({
      contents: asciiComments(await Bun.file(path).text()),
      loader: "js",
    }));
  },
};
