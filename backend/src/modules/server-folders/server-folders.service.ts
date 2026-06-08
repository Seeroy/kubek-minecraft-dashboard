import { ServerFoldersRepository } from "@/modules/database/repositories/server-folders.repository";
import { ServersRepository } from "@/modules/database/repositories/servers.repository";
import { CreateFolderDto } from "@/modules/server-folders/dto/create-folder.dto";
import { UpdateFolderDto } from "@/modules/server-folders/dto/update-folder.dto";
import { Injectable, NotFoundException } from "@nestjs/common";
import type { IServerFolder } from "@shared/types/server/folder.types";

@Injectable()
export class ServerFoldersService {
  constructor(
    private readonly folders: ServerFoldersRepository,
    private readonly servers: ServersRepository,
  ) {}

  list(): IServerFolder[] {
    return this.folders.findAll();
  }

  get(id: string): IServerFolder {
    const folder = this.folders.findById(id);
    if (!folder) throw new NotFoundException("Folder not found");
    return folder;
  }

  create(dto: CreateFolderDto): IServerFolder {
    return this.folders.create(dto);
  }

  update(id: string, dto: UpdateFolderDto): IServerFolder {
    const updated = this.folders.update(id, dto);
    if (!updated) throw new NotFoundException("Folder not found");
    return updated;
  }

  delete(id: string): { deleted: true } {
    const ok = this.folders.delete(id);
    if (!ok) throw new NotFoundException("Folder not found");
    return { deleted: true };
  }

  move(serverIds: string[], folderId: string | null): { moved: number } {
    if (folderId != null) {
      const folder = this.folders.findById(folderId);
      if (!folder) throw new NotFoundException("Folder not found");
    }
    // Filter to existing servers to avoid silent no-ops on bad ids
    const validIds = serverIds.filter(
      (id) => this.servers.findById(id) != null,
    );
    const moved = this.folders.moveServers(validIds, folderId);
    return { moved };
  }
}
