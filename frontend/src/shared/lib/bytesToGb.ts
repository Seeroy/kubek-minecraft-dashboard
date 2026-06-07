/**
 * Convert bytes to gigabytes
 * @param bytes
 */
export const bytesToGB = (bytes: number, digitsCount: number = 2): number => {
  return Number((bytes / 1024 / 1024 / 1024).toFixed(digitsCount));
};

/**
 * Format a byte count as a human-readable size (B, KB, MB, GB, TB, PB)
 */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1024;
  for (const u of units) {
    if (v < 1024) return `${v.toFixed(1)} ${u}`;
    v /= 1024;
  }
  return `${v.toFixed(1)} PB`;
};

/**
 * Convert bytes to file size
 * @param size
 */
export const humanizeFileSize = (size: number) => {
  if (size < 1024) {
    return size + " B";
  } else if (size < 1024 * 1024) {
    return Math.round((size / 1024) * 10) / 10 + " Kb";
  } else if (size >= 1024 * 1024 && size < 1024 * 1024 * 1024) {
    return Math.round((size / 1024 / 1024) * 10) / 10 + " Mb";
  } else if (size >= 1024 * 1024 * 1024) {
    return Math.round((size / 1024 / 1024 / 1024) * 10) / 10 + " Gb";
  } else {
    return size + " ?";
  }
};
