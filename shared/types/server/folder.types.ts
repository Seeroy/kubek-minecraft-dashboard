export interface IServerFolder {
  id: string;
  name: string;
  color?: string | null;
  sortOrder: number;
  createdAt: number;
}

export interface CreateServerFolderProps {
  name: string;
  color?: string | null;
  sortOrder?: number;
}

export interface UpdateServerFolderProps {
  name?: string;
  color?: string | null;
  sortOrder?: number;
}

export interface MoveServersProps {
  serverIds: string[];
  folderId: string | null;
}
