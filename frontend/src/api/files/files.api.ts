import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type {
  BatchPathsDto,
  CreateArchiveDto,
  CreateDirectoryDto,
  ExtractArchiveDto,
  FileContentResponse,
  FileItem,
  FileOperationDto,
  FilesTaskStartResponse,
  RenameFileDto,
  WriteFileDto,
} from "./files.model";

export class FilesApi {
  constructor(private authHttp: AuthHttpClient) {}

  scanDirectory = (serverId: string, path: string): Promise<FileItem[]> => {
    return this.authHttp.get<FileItem[]>("files/scan", {
      searchParams: { serverId, path },
    });
  };

  searchFiles = (
    serverId: string,
    query: string,
    path = ""
  ): Promise<FileItem[]> => {
    return this.authHttp.get<FileItem[]>("files/search", {
      searchParams: { serverId, query, path },
    });
  };

  readFile = async (serverId: string, path: string): Promise<string> => {
    const { content } = await this.authHttp.get<FileContentResponse>(
      "files/content",
      {
        searchParams: { serverId, path },
      }
    );
    return content;
  };

  writeFile = async (serverId: string, data: WriteFileDto): Promise<void> => {
    await this.authHttp.post<void>("files/content", {
      searchParams: { serverId },
      json: data,
    });
  };

  downloadFile = (serverId: string, path: string): Promise<Blob> => {
    return this.authHttp.raw
      .get("files/download", {
        searchParams: { serverId, path },
      })
      .blob();
  };

  createDirectory = async (
    serverId: string,
    data: CreateDirectoryDto
  ): Promise<void> => {
    await this.authHttp.post<void>("files/directory", {
      searchParams: { serverId },
      json: data,
    });
  };

  uploadFile = async (
    serverId: string,
    path: string,
    file: File
  ): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);

    await this.authHttp.post<void>("files/upload", {
      searchParams: { serverId, path },
      body: formData,
    });
  };

  deleteDirectory = async (
    serverId: string,
    data: FileOperationDto
  ): Promise<void> => {
    await this.authHttp.delete<void>("files/directory", {
      searchParams: { serverId },
      json: data,
    });
  };

  renameFile = async (serverId: string, data: RenameFileDto): Promise<void> => {
    await this.authHttp.put<void>("files/rename", {
      searchParams: { serverId },
      json: data,
    });
  };

  deleteFile = async (
    serverId: string,
    data: FileOperationDto
  ): Promise<void> => {
    await this.authHttp.delete<void>("files/file", {
      searchParams: { serverId },
      json: data,
    });
  };

  // Returns a taskId
  batchDelete = (
    serverId: string,
    data: BatchPathsDto
  ): Promise<FilesTaskStartResponse> => {
    return this.authHttp.post<FilesTaskStartResponse>("files/batch-delete", {
      searchParams: { serverId },
      json: data,
    });
  };

  // Returns a taskId
  createArchive = (
    serverId: string,
    data: CreateArchiveDto
  ): Promise<FilesTaskStartResponse> => {
    return this.authHttp.post<FilesTaskStartResponse>("files/archive", {
      searchParams: { serverId },
      json: data,
    });
  };

  // Returns a taskId
  extractArchive = (
    serverId: string,
    data: ExtractArchiveDto
  ): Promise<FilesTaskStartResponse> => {
    return this.authHttp.post<FilesTaskStartResponse>("files/extract", {
      searchParams: { serverId },
      json: data,
    });
  };
}

export const filesApi = new FilesApi(authHttp);
