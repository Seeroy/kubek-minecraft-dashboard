import { hashPassword } from "@/core/utils/security";
import { CreateAccountDto } from "@/modules/accounts/dto/create-account.dto";
import { UsersRepository } from "@/modules/database/repositories/users.repository";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type { IUser } from "@shared/types/user.types";
import { UserPermissions } from "@shared/types/user.types";
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

  async create(user: CreateAccountDto): Promise<void> {
    if (this.findByUsername(user.username)) {
      throw new BadRequestException("Username already exists");
    }

    const hashedPassword = await hashPassword(user.password);

    this.users.create({
      id: randomUUID(),
      ...user,
      password: hashedPassword,
      secret: "",
      serversRestrict: {
        enabled: (user.servers && user.servers?.length > 0) || false,
        allowed: user.servers || [],
      },
    });
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

  createDefaultAccount(hashedPassword: string): IUser {
    const defaultUser: IUser = {
      id: randomUUID(),
      username: "kubek",
      password: hashedPassword,
      secret: "",
      permissions: Object.values(UserPermissions),
      serversRestrict: {
        enabled: false,
        allowed: [],
      },
      isAdmin: true,
    };

    this.create(defaultUser);
    return defaultUser;
  }
}
