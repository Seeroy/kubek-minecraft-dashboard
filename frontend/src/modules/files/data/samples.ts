import { FileType, type IFile } from "@shared/types/file.types";

const entry = (name: string, type: FileType, size = 0): IFile => ({ name, path: `/${name}`, type, size, modify: new Date(0) });

export const SAMPLE_FILES: IFile[] = [
  entry("plugins", FileType.DIRECTORY),
  entry("world", FileType.DIRECTORY),
  entry("logs", FileType.DIRECTORY),
  entry("server.properties", FileType.FILE, 1_420),
  entry("bukkit.yml", FileType.FILE, 3_100),
  entry("paper-1.21.4.jar", FileType.FILE, 48_000_000),
];
