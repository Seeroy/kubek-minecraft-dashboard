import type { BatchPathsDto, CreateArchiveDto, ExtractArchiveDto } from "@/api";
import { api } from "@/api";
import { FileType, type IFile } from "@shared/types/file.types";
import { useCallback } from "react";
import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { filesAdapter } from "./files.adapter";
import { qk } from "@/shared/queries/query-keys";

const filesListOptions = (serverId: string | undefined, path: string) =>
  queryOptions({
    queryKey: qk.files.scan(serverId ?? "", path),
    queryFn: async (): Promise<IFile[]> => {
      const files = await api.files.scanDirectory(serverId!, path);
      return files.map(filesAdapter.toInternal);
    },
    staleTime: 30_000,
  });

export function useFilesList(serverId: string | undefined, path: string) {
  return useQuery({
    ...filesListOptions(serverId, path),
    enabled: !!serverId,
    placeholderData: keepPreviousData,
  });
}

/** Loads a folder ahead of the click, a fresh cached listing is left alone */
export function usePrefetchFiles(serverId: string) {
  const queryClient = useQueryClient();
  return useCallback((path: string) => void queryClient.prefetchQuery(filesListOptions(serverId, path)), [queryClient, serverId]);
}

export function useFilesSearch(
  serverId: string | undefined,
  query: string,
  enabled: boolean
) {
  return useQuery({
    queryKey: qk.files.search(serverId ?? "", query),
    queryFn: async (): Promise<IFile[]> => {
      const files = await api.files.searchFiles(serverId!, query);
      return files.map(filesAdapter.toInternal);
    },
    enabled: !!serverId && enabled && query.trim().length >= 2,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useInvalidateFiles() {
  const queryClient = useQueryClient();
  return (serverId: string | undefined) => {
    if (!serverId) return Promise.resolve();
    return queryClient.invalidateQueries({
      queryKey: qk.files.scanByServer(serverId),
    });
  };
}

export function useBatchDeleteFilesMutation(serverId: string | undefined) {
  return useMutation({
    mutationFn: (data: BatchPathsDto) => api.files.batchDelete(serverId!, data),
  });
}

export function useCreateFilesArchiveMutation(serverId: string | undefined) {
  return useMutation({
    mutationFn: (data: CreateArchiveDto) =>
      api.files.createArchive(serverId!, data),
  });
}

export function useExtractFilesArchiveMutation(serverId: string | undefined) {
  return useMutation({
    mutationFn: (data: ExtractArchiveDto) =>
      api.files.extractArchive(serverId!, data),
  });
}

/** File content for the editor, not cached */
export function useReadFileMutation(serverId: string | undefined) {
  return useMutation({
    mutationFn: (path: string) => api.files.readFile(serverId!, path),
    meta: { silent: true },
  });
}

export function useWriteFileMutation(serverId: string | undefined) {
  return useMutation({
    mutationFn: (data: { path: string; data: string }) =>
      api.files.writeFile(serverId!, data),
    meta: { silent: true },
  });
}

export function useCreateDirectoryMutation(serverId: string | undefined) {
  return useMutation({
    mutationFn: (data: { path: string; name: string }) =>
      api.files.createDirectory(serverId!, data),
    meta: { silent: true },
  });
}

export function useUploadFileMutation(serverId: string | undefined) {
  return useMutation({
    mutationFn: ({ path, file }: { path: string; file: File }) =>
      api.files.uploadFile(serverId!, path, file),
    meta: { silent: true },
  });
}

export function useDeleteEntryMutation(serverId: string | undefined) {
  return useMutation({
    mutationFn: (file: Pick<IFile, "path" | "type">) =>
      file.type === FileType.DIRECTORY
        ? api.files.deleteDirectory(serverId!, { path: file.path })
        : api.files.deleteFile(serverId!, { path: file.path }),
    meta: { silent: true },
  });
}

export function useDownloadFileMutation(serverId: string | undefined) {
  return useMutation({
    mutationFn: (path: string) => api.files.downloadFile(serverId!, path),
    meta: { silent: true },
  });
}
