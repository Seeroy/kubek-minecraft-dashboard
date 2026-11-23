import { getErrorMessage } from "@/core/utils/error";
import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import type { IUser } from "@shared/types/user.types";
import { type ExtActor, extActor } from "./context/ext-audit";
import { extPermissionsOf } from "./ext-user";
import { ExtensionRegistry } from "./extension-registry.service";

export interface ExtCommandEntry {
  extId: string;
  extName: string;
  id: string;
  title: string;
  icon?: string;
  permission?: string;
}

/** Commands extensions registered with ctx.commands, for the command palette */
@Injectable()
export class ExtensionCommands {
  constructor(private readonly registry: ExtensionRegistry) {}

  list(user: IUser): ExtCommandEntry[] {
    return this.registry.list().flatMap(({ record }) =>
      this.registry
        .getCommands(record.id)
        .filter((cmd) => allowed(user, cmd.permission))
        .map((cmd) => ({
          extId: record.id,
          extName: record.manifest.name,
          id: cmd.id,
          title: cmd.title,
          icon: cmd.icon,
          permission: cmd.permission,
        })),
    );
  }

  async run(extId: string, commandId: string, user: IUser, actor: ExtActor): Promise<void> {
    const cmd = this.registry.isActive(extId)
      ? this.registry.getCommands(extId).find((c) => c.id === commandId)
      : undefined;
    if (!cmd) throw new NotFoundException(`Unknown command: ${extId}/${commandId}`);
    if (!allowed(user, cmd.permission))
      throw new ForbiddenException(`Missing permission: ${cmd.permission}`);
    try {
      await extActor.run(actor, () => cmd.run());
    } catch (error) {
      throw new InternalServerErrorException(getErrorMessage(error));
    }
  }
}

function allowed(user: IUser, permission?: string): boolean {
  return !permission || user.isAdmin || extPermissionsOf(user).includes(permission);
}
