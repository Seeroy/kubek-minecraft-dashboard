import { AppEventsService } from "@/core/events/app-events.service";
import type { FTPService } from "@/core/types/config";
import { getErrorMessage } from "@/core/utils/error";
import { extractClientIp } from "@/core/utils/request";
import { checkSubnetAccess } from "@/core/utils/subnets";
import { AccountsService } from "@/modules/accounts/accounts.service";
import { FtpPasswordService } from "@/modules/accounts/ftp-password.service";
import { ConfigService } from "@/modules/config/config.service";
import { ipKey } from "@/modules/rate-limit/ip-key";
import {
  loginKey,
  RateLimitService,
} from "@/modules/rate-limit/rate-limit.service";
import { ServersService } from "@/modules/servers/servers.service";
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { AccessArea } from "@shared/access/areas";
import { can } from "@shared/access/can";
import { FtpServer } from "ftpd";
import type { Socket } from "net";
import { FtpFs } from "./ftp-fs";

const DEFAULT_PORT = 21;

// ftpd ships without types
interface FtpServerHandle {
  listen(port: number): void;
  close(): void;
  on(event: string, listener: (...args: any[]) => void): void;
}

/** Port, FTP_PORT wins over the panel setting */
export function resolveFtpPort(
  config: FTPService | undefined,
  env: NodeJS.ProcessEnv = process.env,
): number {
  const fromEnv = Number(env.FTP_PORT);
  if (env.FTP_PORT && Number.isInteger(fromEnv) && fromEnv > 0) return fromEnv;
  const fromConfig = Number(config?.port);
  if (Number.isInteger(fromConfig) && fromConfig > 0) return fromConfig;
  return DEFAULT_PORT;
}

/**
 * Address for the 227 reply. FTP_PASV_HOST for NAT and Docker, otherwise
 * the address the client connected to. PASV is IPv4 only
 */
export function resolvePasvHost(
  localAddress: string | undefined,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const configured = env.FTP_PASV_HOST?.trim();
  if (configured) return configured;
  const local = (localAddress ?? "").replace(/^::ffff:/i, "");
  if (/^\d+\.\d+\.\d+\.\d+$/.test(local) && local !== "0.0.0.0") return local;
  return "127.0.0.1";
}

@Injectable()
export class FtpService implements OnModuleInit, OnModuleDestroy {
  private server: FtpServerHandle | null = null;
  private port: number | null = null;
  private readonly sockets = new Set<Socket>();
  // Logged in sockets per account
  private readonly sessions = new Map<string, Set<Socket>>();
  private readonly logger = new Logger(FtpService.name);

  constructor(
    private readonly accounts: AccountsService,
    private readonly ftpPasswords: FtpPasswordService,
    private readonly serversService: ServersService,
    private readonly configService: ConfigService,
    private readonly rateLimit: RateLimitService,
    private readonly events: AppEventsService,
  ) {}

  onModuleInit() {
    this.apply(this.configService.get("ftpd"));
    this.events.on("config.changed", ({ after }) => this.apply(after.ftpd));
    this.events.on("account.ftp_password_changed", ({ userId }) =>
      this.dropSessions(userId),
    );
  }

  onModuleDestroy() {
    this.stop();
  }

  /** Start, stop or move to a new port to match the settings */
  private apply(config: FTPService | undefined): void {
    const port = resolveFtpPort(config);
    if (!config?.enabled) {
      if (this.server) this.logger.log("FTP disabled, stopping");
      this.stop();
      return;
    }
    if (this.server && this.port === port) return;
    this.stop();
    this.start(port);
  }

  private start(port: number): void {
    const pasvStart = Number(process.env.FTP_PASV_START ?? 50000);
    const pasvEnd = Number(process.env.FTP_PASV_END ?? 50100);
    const server: FtpServerHandle = new FtpServer(resolvePasvHost(undefined), {
      getInitialCwd: () => "/",
      // Fake root, FtpFs turns the first segment into a server folder
      getRoot: () => "/",
      pasvPortRangeStart: pasvStart,
      pasvPortRangeEnd: pasvEnd,
      hideDotFiles: true,
    });

    server.on("client:connected", (connection) =>
      this.onConnection(connection),
    );
    server.on("error", (err: Error) => {
      this.logger.error(`FTP server error: ${getErrorMessage(err)}`);
    });

    server.listen(port);
    this.server = server;
    this.port = port;
    this.logger.log(`FTP listening on port ${port}`);
  }

  private stop(): void {
    if (!this.server) return;
    try {
      this.server.close();
    } catch (err) {
      this.logger.warn(`FTP close failed: ${getErrorMessage(err)}`);
    }
    for (const socket of this.sockets) socket.destroy();
    this.sockets.clear();
    this.sessions.clear();
    this.server = null;
    this.port = null;
  }

  private onConnection(connection: any): void {
    const socket: Socket = connection.socket;
    const ip = extractClientIp({ socket });
    if (!this.subnetAllowed(ip)) {
      this.logger.warn(`FTP connection from ${ip} rejected by subnet rules`);
      socket.destroy();
      return;
    }
    this.sockets.add(socket);
    socket.once("close", () => this.sockets.delete(socket));

    // ftpd takes the PASV address from server.host, so set it per session
    connection.server = Object.create(connection.server as object, {
      host: { value: resolvePasvHost(socket.localAddress) },
    });

    let pendingUsername = "";

    // ftpd thinks a set username means logged in, so set it only on PASS
    connection.on("command:user", (user: string, success: () => void) => {
      pendingUsername = String(user ?? "");
      success();
    });

    connection.on(
      "command:pass",
      (
        pass: string,
        success: (username: string, fs: FtpFs) => void,
        failure: () => void,
      ) => {
        let userId: string | null;
        try {
          userId = this.authenticate(pendingUsername, pass, ip);
        } catch (err) {
          this.logger.warn(`FTP login failed: ${getErrorMessage(err)}`);
          return failure();
        }
        if (!userId) return failure();
        const id = userId;
        const fs = new FtpFs({
          getUser: () => this.accounts.findById(id),
          listServerIds: () =>
            this.serversService.findAll().map((server) => server.id),
        });
        this.track(id, socket);
        success(pendingUsername, fs);
      },
    );
  }

  /**
   * Same limits as the panel login, only the FTP password works,
   * returns the user id
   */
  authenticate(
    username: string,
    password: string,
    ip: string | null,
  ): string | null {
    if (!username || !this.subnetAllowed(ip)) return null;
    const key = loginKey(ip, username);
    const name = username.toLowerCase();
    // Throws while locked, the caller sends 530
    this.rateLimit.hit("login.ip", ipKey(ip));
    this.rateLimit.check("login", key);
    this.rateLimit.check("login.user", name);

    const user = this.accounts.findByUsername(username);
    // Unknown users go through the same compare
    const valid = this.ftpPasswords.verify(user?.id ?? "", password);
    if (!user || !valid) {
      this.rateLimit.fail("login", key, { username, ip });
      this.rateLimit.fail("login.user", name, { username, ip });
      return null;
    }
    this.rateLimit.succeed("login", key);
    this.rateLimit.succeed("login.user", name);

    if (!can(user, AccessArea.FILES, "read")) {
      this.logger.warn(`FTP login of ${username} without files access`);
      return null;
    }
    return user.id;
  }

  private track(userId: string, socket: Socket): void {
    let set = this.sessions.get(userId);
    if (!set) {
      set = new Set();
      this.sessions.set(userId, set);
    }
    set.add(socket);
    socket.once("close", () => set.delete(socket));
  }

  /** New or removed FTP password kicks the old sessions */
  private dropSessions(userId: string): void {
    for (const socket of this.sessions.get(userId) ?? []) socket.destroy();
    this.sessions.delete(userId);
  }

  private subnetAllowed(ip: string | null): boolean {
    return checkSubnetAccess(
      this.configService.get("subnetsAccessRestriction"),
      ip,
    ).allowed;
  }
}
