import { ApiErrorCode } from "@/core/errors/error-codes";
import { ConflictException, Injectable } from "@nestjs/common";

/** Work that owns the server folder until it ends */
export type ServerLockKind = "backup" | "restore";

/**
 * One file level operation per server at a time. A backup and a restore of
 * the same folder must never interleave, and a restore must finish before
 * the server may start
 */
@Injectable()
export class ServerLocksService {
  private readonly held = new Map<string, ServerLockKind>();

  /** Takes the lock or throws 409, the returned function releases it */
  acquire(serverId: string, kind: ServerLockKind): () => void {
    const current = this.held.get(serverId);
    if (current) {
      throw new ConflictException({
        code: ApiErrorCode.SERVER_BUSY,
        message: `The server is busy with a ${current}`,
      });
    }
    this.held.set(serverId, kind);
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.held.delete(serverId);
    };
  }

  holder(serverId: string): ServerLockKind | null {
    return this.held.get(serverId) ?? null;
  }
}
