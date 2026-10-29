import { ApiErrorCode } from "@/core/errors/error-codes";
import { AppEventsService } from "@/core/events/app-events.service";
import {
  canChangeRoleMembers,
  canUseRole,
  enforcePolicy as enforce,
} from "@/modules/accounts/accounts.policy";
import { RolesRepository } from "@/modules/database/repositories/roles.repository";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { AccessMap } from "@shared/access/areas";
import type { IRole } from "@shared/access/roles";
import type { IUser } from "@shared/types/user.types";
import { randomUUID } from "crypto";

export interface RoleView extends IRole {
  members: number;
}

export interface RoleInput {
  name?: string;
  description?: string | null;
  grants?: AccessMap;
  ext?: string[];
}

type Actor = Pick<IUser, "id" | "isAdmin" | "access" | "serversRestrict">;

@Injectable()
export class RolesService {
  constructor(
    private readonly roles: RolesRepository,
    private readonly users: UsersRepository,
    private readonly events: AppEventsService,
  ) {}

  list(): RoleView[] {
    const counts = this.roles.memberCounts();
    return this.roles
      .findAll()
      .map((role) => ({ ...role, members: counts[role.id] ?? 0 }));
  }

  get(id: string): RoleView {
    const role = this.find(id);
    return { ...role, members: this.roles.memberIds(id).length };
  }

  /** Roles for the ids in the same order, an unknown id is a bad request */
  resolve(ids: string[]): IRole[] {
    return [...new Set(ids)].map((id) => {
      const role = this.roles.findById(id);
      if (!role) {
        throw new BadRequestException({
          code: ApiErrorCode.ROLE_UNKNOWN,
          message: `Role ${id} does not exist`,
        });
      }
      return role;
    });
  }

  /** Name for logs, the id when the role is gone */
  nameOf(id: string): string {
    return this.roles.findById(id)?.name ?? id;
  }

  create(actor: Actor, input: RoleInput & { name: string }): RoleView {
    const now = Date.now();
    const role: IRole = {
      id: randomUUID(),
      name: this.freeName(input.name.trim()),
      description: input.description?.trim() || null,
      builtinKey: null,
      grants: input.grants ?? {},
      ext: unique(input.ext ?? []),
      createdAt: now,
      updatedAt: now,
    };
    enforce(canUseRole(actor, role));
    this.roles.create(role);
    return this.get(role.id);
  }

  update(
    actor: Actor,
    id: string,
    input: RoleInput,
  ): { before: IRole; after: RoleView } {
    const before = this.find(id);
    enforce(canUseRole(actor, before));
    const members = this.members(id);
    enforce(canChangeRoleMembers(actor, members));

    const name = input.name?.trim() ?? before.name;
    if (before.builtinKey && name !== before.name) {
      throw new BadRequestException({
        code: ApiErrorCode.ROLE_BUILTIN,
        message: "Built-in roles can't be renamed",
      });
    }
    const next: IRole = {
      ...before,
      name: this.freeName(name, id),
      description:
        input.description === undefined
          ? before.description
          : input.description?.trim() || null,
      grants: input.grants ?? before.grants,
      ext: input.ext ? unique(input.ext) : before.ext,
      updatedAt: Date.now(),
    };
    enforce(canUseRole(actor, next));
    this.roles.update(next);
    if (input.grants || input.ext) this.accessChanged(members);
    return { before, after: this.get(id) };
  }

  remove(actor: Actor, id: string): RoleView {
    const role = this.get(id);
    if (role.builtinKey) {
      throw new BadRequestException({
        code: ApiErrorCode.ROLE_BUILTIN,
        message: "Built-in roles can't be deleted",
      });
    }
    enforce(canUseRole(actor, role));
    const members = this.members(id);
    enforce(canChangeRoleMembers(actor, members));
    this.roles.delete(id);
    this.accessChanged(members);
    return role;
  }

  private accessChanged(members: IUser[]): void {
    for (const user of members) {
      this.events.emit("user.access_changed", { userId: user.id });
    }
  }

  /** Accounts holding the role */
  members(id: string): IUser[] {
    return this.roles
      .memberIds(id)
      .map((userId) => this.users.findById(userId))
      .filter((user): user is IUser => !!user);
  }

  duplicate(actor: Actor, id: string, name?: string): RoleView {
    const source = this.find(id);
    return this.create(actor, {
      name: name?.trim() || this.copyName(source.name),
      description: source.description,
      grants: source.grants,
      ext: source.ext,
    });
  }

  private find(id: string): IRole {
    const role = this.roles.findById(id);
    if (!role) throw new NotFoundException("Role not found");
    return role;
  }

  // Names are unique regardless of case
  private freeName(name: string, selfId?: string): string {
    const other = this.roles.findByName(name);
    if (other && other.id !== selfId) {
      throw new ConflictException({
        code: ApiErrorCode.ROLE_NAME_TAKEN,
        message: `Role "${name}" already exists`,
      });
    }
    return name;
  }

  private copyName(name: string): string {
    for (let n = 1; ; n++) {
      const candidate = n === 1 ? `${name} (copy)` : `${name} (copy ${n})`;
      if (!this.roles.findByName(candidate)) return candidate;
    }
  }
}

function unique(keys: string[]): string[] {
  return [...new Set(keys)];
}
