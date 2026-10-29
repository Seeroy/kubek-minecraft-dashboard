import { hashPassword } from "@/core/utils/security";
import { CreateAccountDto } from "@/modules/accounts/dto/create-account.dto";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { IUser } from "@shared/types/user.types";
import { randomUUID } from "crypto";

@Injectable()
export class AccountsService {
  constructor(private readonly users: UsersRepository) {}

  findAll(): IUser[] {
    return this.users.findAll();
  }

  findById(id: string): IUser | null {
    return this.users.findById(id);
  }

  findByUsername(username: string): IUser | null {
    return this.users.findByUsername(username);
  }

  async create(dto: CreateAccountDto): Promise<IUser> {
    if (this.findByUsername(dto.username)) {
      throw new BadRequestException("Username already exists");
    }

    const id = randomUUID();
    const servers = dto.servers ?? [];
    this.users.create({
      id,
      username: dto.username,
      password: await hashPassword(dto.password),
      roles: dto.roles ?? [],
      grants: dto.grants ?? {},
      extPermissions: dto.extPermissions ?? [],
      // Computed by the repository on read
      access: { levels: {}, ext: [] },
      serversRestrict: { enabled: servers.length > 0, allowed: servers },
    });
    return this.findById(id)!;
  }

  update(user: IUser): void {
    if (!this.findById(user.id)) {
      throw new NotFoundException("User not found");
    }
    this.users.update(user);
  }

  delete(id: string): void {
    if (!this.findById(id)) {
      throw new NotFoundException("User not found");
    }
    this.users.delete(id);
  }
}
