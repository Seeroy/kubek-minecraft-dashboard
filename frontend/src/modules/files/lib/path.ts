// Canonical file path form used across the files module: no leading/trailing
// slashes, forward slashes only. Root is the empty string ""

export function normalizeFilesPath(path: string): string {
  return path
    .split(/[/\\]+/)
    .filter(Boolean)
    .join("/");
}

export function splitFilesPath(path: string): string[] {
  return normalizeFilesPath(path).split("/").filter(Boolean);
}

export function getParentPath(path: string): string {
  const parts = splitFilesPath(path);
  parts.pop();
  return parts.join("/");
}
