import { Glob } from "bun";

/**
 * Patterns without a slash match a file or folder name at any depth (like
 * .gitignore), patterns with a slash match the path from the server root
 */
export function createExclusionMatcher(
  patterns: string[] = [],
): (relPath: string) => boolean {
  const rules = patterns
    .map((pattern) => pattern.trim().replace(/^\.\//, "").replace(/\/+$/, ""))
    .filter(Boolean)
    .map((pattern) => ({
      anchored: pattern.includes("/"),
      glob: new Glob(pattern),
    }));
  if (rules.length === 0) return () => false;

  return (relPath) => {
    const segments = relPath.split(/[\\/]/);
    return rules.some(({ anchored, glob }) =>
      anchored
        ? segments.some((_, i) =>
            glob.match(segments.slice(0, i + 1).join("/")),
          )
        : segments.some((segment) => glob.match(segment)),
    );
  };
}
