import { AccountsService } from "@/modules/accounts/accounts.service";
import { Injectable } from "@nestjs/common";
import type { IUser } from "@shared/types/user.types";
import * as bcrypt from "bcryptjs";

/**
 * Service handling authentication logic including login, token generation and validation
 */
@Injectable()
export class AuthService {
  constructor(private readonly accountsService: AccountsService) {}

  /**
   * Validates user credentials and returns user data if valid.
   * @param username - The username to validate
   * @param password - The password to validate
   * @returns User data if credentials are valid, null otherwise
   */
  async validateUser(
    username: string,
    password: string,
  ): Promise<IUser | null> {
    const user = this.accountsService.findByUsername(username);
    if (!user) return null;

    const isValid = await this.comparePasswords(password, user.password);
    if (!isValid) return null;

    return user;
  }

  /**
   * Compares a plain text password with a hashed password.
   * @param plainPassword - The plain text password
   * @param hashedPassword - The hashed password to compare against
   * @returns True if passwords match, false otherwise
   */
  async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  completeOOBE(user: IUser): void {
    if (user.oobeCompleted) return;
    this.accountsService.update({ ...user, oobeCompleted: true });
  }
}
