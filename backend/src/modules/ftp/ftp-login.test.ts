import { describe, expect, test } from "bun:test";
import type { AppEventsService } from "@/core/events/app-events.service";
import { hashPassword } from "@/core/utils/security";
import type { AccountsService } from "@/modules/accounts/accounts.service";
import { FtpPasswordService } from "@/modules/accounts/ftp-password.service";
import type { ConfigService } from "@/modules/config/config.service";
import type {
  FtpCredential,
  FtpCredentialsRepository,
} from "@/modules/database/repositories/ftp-credentials.repository";
import type { RateLimitService } from "@/modules/rate-limit/rate-limit.service";
import type { ServersService } from "@/modules/servers/servers.service";
import { userWith } from "@/testing/user";
import { AccessArea } from "@shared/access/areas";
import type { IUser } from "@shared/types/user.types";
import { fake } from "@/testing/fake";
import { FtpService } from "./ftp.service";

const PANEL_PASSWORD = "panel-secret";

async function setup(over: Partial<IUser> = {}) {
  const user: IUser = userWith(
    { [AccessArea.FILES]: "read" },
    {
      id: "u1",
      username: "steve",
      password: await hashPassword(PANEL_PASSWORD),
      ...over,
    },
  );
  const store = new Map<string, FtpCredential>();
  const repo = fake<FtpCredentialsRepository>({
    findByUserId: (id: string) => store.get(id) ?? null,
    set: (userId: string, password: string, createdAt: number) =>
      store.set(userId, { userId, password, createdAt }),
    delete: (id: string) => store.delete(id),
  });
  const passwords = new FtpPasswordService(repo);
  const failures: string[] = [];
  const rateLimit = fake<RateLimitService>({
    hit: () => undefined,
    check: () => undefined,
    fail: (policy: string) => failures.push(policy),
    succeed: () => undefined,
  });
  const accounts = fake<AccountsService>({
    findByUsername: (name) => (name === user.username ? user : null),
  });
  const config = fake<ConfigService>({
    get: () => ({ enabled: false }),
  });
  const service = new FtpService(
    accounts,
    passwords,
    fake<ServersService>(),
    config,
    rateLimit,
    fake<AppEventsService>(),
  );
  return { service, passwords, failures };
}

describe("FTP login", () => {
  test("account without an FTP password can't log in", async () => {
    const { service, failures } = await setup();
    expect(service.authenticate("steve", PANEL_PASSWORD, null)).toBe(null);
    expect(failures).toEqual(["login", "login.user"]);
  });

  test("panel password is not accepted once an FTP password exists", async () => {
    const { service, passwords } = await setup();
    passwords.issue("u1");
    expect(service.authenticate("steve", PANEL_PASSWORD, null)).toBe(null);
  });

  test("FTP password logs in", async () => {
    const { service, passwords } = await setup();
    const { password } = passwords.issue("u1");
    expect(service.authenticate("steve", password, null)).toBe("u1");
  });

  test("reset makes the old FTP password useless", async () => {
    const { service, passwords } = await setup();
    const first = passwords.issue("u1");
    passwords.issue("u1");
    expect(service.authenticate("steve", first.password, null)).toBe(null);
  });

  test("removed password and unknown users are refused", async () => {
    const { service, passwords } = await setup();
    const { password } = passwords.issue("u1");
    passwords.remove("u1");
    expect(service.authenticate("steve", password, null)).toBe(null);
    expect(service.authenticate("ghost", password, null)).toBe(null);
  });

  test("files read is still required", async () => {
    const { service, passwords } = await setup({
      access: { levels: { [AccessArea.CONSOLE]: "write" }, ext: [] },
    });
    const { password } = passwords.issue("u1");
    expect(service.authenticate("steve", password, null)).toBe(null);
  });

  test("ensure issues only once and the value can be read back", async () => {
    const { passwords } = await setup();
    expect(passwords.ensure("u1")).toBe(true);
    const first = passwords.reveal("u1");
    expect(passwords.ensure("u1")).toBe(false);
    expect(passwords.reveal("u1")).toEqual(first);
    expect(passwords.reveal("nobody")).toBe(null);
  });

  test("generated passwords are long and random", () => {
    const a = FtpPasswordService.generate();
    expect(a).toMatch(/^[A-Za-z0-9_-]{24}$/);
    expect(FtpPasswordService.generate()).not.toBe(a);
  });
});
