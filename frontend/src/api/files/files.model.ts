import type { components } from "../types";

export type FileItem = components["schemas"]["FileEntity"];
export type FileContentResponse =
  components["schemas"]["FileContentResponseDto"];
export type WriteFileDto = components["schemas"]["WriteFileDto"];
export type CreateDirectoryDto = components["schemas"]["CreateDirectoryDto"];
export type FileOperationDto = components["schemas"]["FileOperationDto"];
export type RenameFileDto = components["schemas"]["RenameFileDto"];
export type BatchPathsDto = components["schemas"]["BatchPathsDto"];
export type CreateArchiveDto = components["schemas"]["CreateArchiveDto"];
export type ExtractArchiveDto = components["schemas"]["ExtractArchiveDto"];
export type FilesTaskStartResponse =
  components["schemas"]["TaskRefResponseDto"];
