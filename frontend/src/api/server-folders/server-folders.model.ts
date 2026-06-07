import type { components } from "../types";

export type IServerFolder = components["schemas"]["ServerFolderEntity"];
export type FolderMoveResponse = components["schemas"]["FolderMoveResponseDto"];

export type {
  CreateServerFolderProps,
  UpdateServerFolderProps
} from "@shared/types/server/folder.types";

