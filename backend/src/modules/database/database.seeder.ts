import { generateRandomString } from "@/core/utils/randomString";
import { hashPassword } from "@/core/utils/security";
import { Startup } from "@/core/utils/startup";
import { Injectable } from "@nestjs/common";
import type { IUser } from "@shared/types/user.types";
import { randomUUID } from "crypto";
import process from "node:process";
import { UsersRepository } from "./repositories/users.repository";

/**
 * Database seeder to create default data on first run.
 * Creates a default admin user if no users exist.
 * Called from the legacy migration after the 3.x import
 */
@Injectable()
export class DatabaseSeeder {
  constructor(private readonly users: UsersRepository) {}

  async seed() {
    await this.seedDefaultUser();
  }

  /**
   * Seed default admin user if no users exist
   */
  private async seedDefaultUser() {
    const existingUsers = this.users.findAll();

    if (existingUsers.length > 0) {
      return;
    }

    const defaultPassword =
      process.env.NODE_ENV === "development"
        ? "Kubek2026"
        : generateRandomString(16);
    const hashedPassword = await hashPassword(defaultPassword);

    const defaultUser: IUser = {
      id: randomUUID(),
      username: "kubek",
      password: hashedPassword,
      roles: [],
      grants: {},
      extPermissions: [],
      access: { levels: {}, ext: [] },
      serversRestrict: {
        enabled: false,
        allowed: [],
      },
      isAdmin: true,
    };

    this.users.create(defaultUser);
    Startup.setDefaultAdmin(defaultPassword);
  }
}
