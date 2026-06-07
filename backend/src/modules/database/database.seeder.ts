import { generateRandomString } from "@/core/utils/randomString";
import { hashPassword } from "@/core/utils/security";
import { Injectable, OnModuleInit } from "@nestjs/common";
import { UserPermissions } from "@shared/types/user.types";
import chalk from "chalk";
import { randomUUID } from "crypto";
import process from "node:process";
import { UsersRepository } from "./repositories/users.repository";

/**
 * Database seeder to create default data on first run.
 * Creates a default admin user if no users exist
 */
@Injectable()
export class DatabaseSeeder implements OnModuleInit {
  constructor(private readonly users: UsersRepository) {}

  async onModuleInit() {
    // Seed synchronously during init so the first request can't race
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

    const defaultUser = {
      id: randomUUID(),
      username: "kubek",
      password: hashedPassword,
      secret: "",
      permissions: Object.values(UserPermissions) as UserPermissions[],
      serversRestrict: {
        enabled: false,
        allowed: [],
      },
      isAdmin: true,
    };

    this.users.create(defaultUser);
    console.log("    😎 Default admin user created:");
    console.log("       Username: kubek");
    console.log("       Password: " + defaultPassword);
    console.warn("      ", chalk.black.bgYellowBright("WARN! Save password!"));
  }
}
