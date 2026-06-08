import { authHttp, type AuthHttpClient } from "@/shared/lib/http";
import type {
  CreateServerFolderProps,
  FolderMoveResponse,
  IServerFolder,
  UpdateServerFolderProps,
} from "./server-folders.model";

export class ServerFoldersApi {
  constructor(private authHttp: AuthHttpClient) {}

  list = (): Promise<IServerFolder[]> =>
    this.authHttp.get<IServerFolder[]>("server-folders");

  create = (data: CreateServerFolderProps): Promise<IServerFolder> =>
    this.authHttp.post<IServerFolder>("server-folders", { json: data });

  update = (
    id: string,
    data: UpdateServerFolderProps
  ): Promise<IServerFolder> =>
    this.authHttp.patch<IServerFolder>(`server-folders/${id}`, { json: data });

  remove = (id: string): Promise<void> =>
    this.authHttp.delete<void>(`server-folders/${id}`);

  move = (
    serverIds: string[],
    folderId: string | null
  ): Promise<FolderMoveResponse> =>
    this.authHttp.post<FolderMoveResponse>("server-folders/move", {
      json: { serverIds, folderId },
    });
}

export const serverFoldersApi = new ServerFoldersApi(authHttp);
