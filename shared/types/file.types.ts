export enum FileType {
  DIRECTORY = "directory",
  FILE = "file",
}

export interface IFile {
  name: string;
  path: string;
  type: FileType;
  size: number;
  modify: Date;
}
