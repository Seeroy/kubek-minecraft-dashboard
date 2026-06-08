import type { FileItem } from "@/api";
import { FileType, type IFile } from "@shared/types/file.types";

export const filesAdapter = {
  // API serialises modify as an ISO string and type as a plain union
  toInternal: (model: FileItem): IFile => ({
    ...model,
    type: model.type as FileType,
    modify:
      typeof model.modify === "string" ? new Date(model.modify) : model.modify,
  }),
};
