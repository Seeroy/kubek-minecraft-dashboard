import { FtpCredentialsRepository } from "@/modules/database/repositories/ftp-credentials.repository";
import { Injectable } from "@nestjs/common";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

export interface IssuedFtpPassword {
  password: string;
  setAt: number;
}

// Hash both sides so the compare takes the same time
const digest = (value: string) => createHash("sha256").update(value).digest();

/** Separate FTP passwords, FTP sends them in plain text */
@Injectable()
export class FtpPasswordService {
  constructor(private readonly repo: FtpCredentialsRepository) {}

  /** 24 url safe chars, 144 bits of randomness */
  static generate(): string {
    return randomBytes(18).toString("base64url");
  }

  issue(userId: string): IssuedFtpPassword {
    const password = FtpPasswordService.generate();
    const setAt = Date.now();
    this.repo.set(userId, password, setAt);
    return { password, setAt };
  }

  /** Creates one if the account has none, true if it did */
  ensure(userId: string): boolean {
    if (this.repo.findByUserId(userId)) return false;
    this.issue(userId);
    return true;
  }

  /** Stored password, settings show it like other secrets */
  reveal(userId: string): IssuedFtpPassword | null {
    const credential = this.repo.findByUserId(userId);
    return credential
      ? { password: credential.password, setAt: credential.createdAt }
      : null;
  }

  remove(userId: string): boolean {
    return this.repo.delete(userId);
  }

  /** Only the FTP password works, no password means no FTP */
  verify(userId: string, password: string): boolean {
    const stored = this.repo.findByUserId(userId)?.password;
    // Compare anyway so a missing password takes the same time
    const same = timingSafeEqual(digest(stored ?? ""), digest(password));
    return !!stored && same;
  }
}
