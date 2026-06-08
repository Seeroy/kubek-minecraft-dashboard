import { getParentPath } from "@/modules/files/lib/path";
import { FileType, type IFile } from "@shared/types/file.types";

/**
 * Check is a file is a log viewer file
 */
export function isLogViewerFile(file: IFile): boolean {
  if (file.type !== FileType.FILE) return false;
  if (!/\.gz$/i.test(file.name)) return false;
  return getParentPath(file.path) === "logs";
}
