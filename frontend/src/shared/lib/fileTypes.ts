/**
 * Check if a file can be opened in the text editor
 * Only allows text-based file types
 */
export const canEditFile = (filename: string): boolean => {
  if (!filename) return false;

  const extension = filename.split(".").pop()?.toLowerCase();

  // Allowed file extensions for text editor
  const editableExtensions = [
    // Scripting
    "js",
    "jsx",
    "ts",
    "tsx",
    "py",
    "rb",
    "php",
    "lua",
    "sh",
    "bash",
    "zsh",
    // Config files
    "json",
    "yaml",
    "yml",
    "toml",
    "ini",
    "conf",
    "properties",
    "xml",
    "html",
    "htm",
    // Data formats
    "sql",
    "csv",
    "md",
    "markdown",
    // Other text files
    "txt",
    "log",
    "css",
    "scss",
    "sass",
    "less",
    "dockerfile",
    "docker",
    "gitignore",
    "gitattributes",
    // Batch files (text-based)
    "bat",
    "cmd",
  ];

  return editableExtensions.includes(extension || "");
};

/**
 * Get file type category for icon display
 */
export type FileTypeCategory =
  | "image"
  | "archive"
  | "script"
  | "text"
  | "other";

export const getFileTypeCategory = (filename: string): FileTypeCategory => {
  if (!filename) return "other";

  const lowerFilename = filename.toLowerCase();
  const parts = lowerFilename.split(".");
  const extension = parts.length > 1 ? parts.pop() : "";
  const secondLast = parts.length > 1 ? parts[parts.length - 1] : "";

  // Check for multi-part extensions first (e.g., tar.gz)
  const multiPartExtension =
    secondLast && extension ? `${secondLast}.${extension}` : "";

  // Image extensions
  const imageExtensions = [
    "jpg",
    "jpeg",
    "png",
    "gif",
    "bmp",
    "svg",
    "webp",
    "ico",
    "tiff",
    "tif",
  ];
  if (imageExtensions.includes(extension || "")) {
    return "image";
  }

  // Archive extensions (including multi-part)
  const archiveExtensions = ["zip", "rar", "7z", "tar", "gz", "bz2", "xz"];
  const multiPartArchives = ["tar.gz", "tar.bz2", "tar.xz"];
  if (
    multiPartArchives.includes(multiPartExtension) ||
    archiveExtensions.includes(extension || "")
  ) {
    return "archive";
  }

  // Script extensions
  const scriptExtensions = ["sh", "bash", "zsh", "bat", "cmd", "ps1"];
  if (scriptExtensions.includes(extension || "")) {
    return "script";
  }

  // Text-based files
  if (canEditFile(filename)) {
    return "text";
  }

  return "other";
};
