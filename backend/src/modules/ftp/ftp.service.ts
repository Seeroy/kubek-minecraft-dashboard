import { AuthService } from "@/modules/auth/auth.service";
import { FileManagerService } from "@/modules/files/file-manager.service";
import { ServersService } from "@/modules/servers/servers.service";
import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { IServer } from "@shared/types/server/server.types";
import { IUser, UserPermissions } from "@shared/types/user.types";
import { createReadStream, createWriteStream, promises as fs } from "fs";
import { FtpServer } from "ftpd";
import { resolve } from "path";

@Injectable()
export class FtpService implements OnModuleInit {
  private server: FtpServer;
  private readonly logger = new Logger(FtpService.name);

  constructor(
    private readonly authService: AuthService,
    private readonly fileManagerService: FileManagerService,
    private readonly serversService: ServersService,
  ) {}

  async onModuleInit() {
    const port = process.env.FTP_PORT || 21;
    const pasvStart = Number(process.env.FTP_PASV_START ?? 50000);
    const pasvEnd = Number(process.env.FTP_PASV_END ?? 50100);
    this.server = new FtpServer("0.0.0.0", {
      port: port,
      getInitialCwd: () => "/",
      getRoot: () => "./servers",
      pasvPortRangeStart: pasvStart,
      pasvPortRangeEnd: pasvEnd,
      hideDotFiles: true,
    });

    this.server.on("client:connected", (connection) => {
      let authenticatedUser: IUser | null = null;
      let usernameSaved = "";

      connection.on("command:user", (user, success, failure) => {
        usernameSaved = user;
        connection.username = user;
        success();
      });

      connection.on("command:pass", async (pass, success, failure) => {
        try {
          const user = await this.authService.validateUser(usernameSaved, pass);
          if (user) {
            authenticatedUser = user;
            success(usernameSaved);
          } else {
            failure(new Error("Invalid username or password"));
          }
        } catch (err) {
          failure(new Error("Authentication failed"));
        }
      });

      connection.on("command:list", async (path, success, failure) => {
        if (!authenticatedUser) return failure(new Error("Not authenticated"));
        try {
          const targetPath = path || "/";

          // For root directory, list server directories
          if (targetPath === "/") {
            const servers = this.serversService.findAll();
            const allowedServers = servers.filter((server) => {
              if (authenticatedUser!.serversRestrict.enabled) {
                return authenticatedUser!.serversRestrict.allowed.includes(
                  server.id,
                );
              }
              return true;
            });
            const list = allowedServers.map((server) => {
              return `drwxrwxrwx 1 user group 0 Jan 01 1970 ${server.name}`;
            });
            return success(list);
          }

          // For server subdirectories, use our custom logic
          const { serverName, subpath } = this.parsePath(targetPath);
          if (!serverName) return failure(new Error("Invalid path"));

          const server = this.getServer(serverName);
          const serverId = server.id;
          this.checkAccess(authenticatedUser, serverId);

          const files = await this.fileManagerService.scanDirectory(
            serverId,
            subpath,
          );
          const list = files.map((file) => {
            const type = file.type === "directory" ? "d" : "-";
            const size = file.size || 0;
            const mtime = file.modify
              ? new Date(file.modify).toISOString().split("T")[0]
              : "Jan 01 1970";
            return `${type}rwxrwxrwx 1 user group ${size} ${mtime} ${file.name}`;
          });
          success(list);
        } catch (err) {
          this.logger.warn(
            `LIST failed for "${path}": ${(err as Error).message}`,
          );
          failure(err);
        }
      });

      connection.on("command:retr", async (path, success, failure) => {
        if (!authenticatedUser) return failure(new Error("Not authenticated"));
        try {
          const { serverName, subpath } = this.parsePath(path);
          if (!serverName || subpath === "/") throw new Error("Invalid path");
          const server = this.getServer(serverName);
          const serverId = server.id;
          this.checkAccess(authenticatedUser, serverId);
          const safePath = this.fileManagerService.resolveSafePath(
            serverId,
            subpath,
          );
          success(createReadStream(safePath));
        } catch (err) {
          failure(err);
        }
      });

      connection.on("command:stor", async (path, success, failure) => {
        if (!authenticatedUser) return failure(new Error("Not authenticated"));
        try {
          const { serverName, subpath } = this.parsePath(path);
          if (!serverName || subpath === "/") throw new Error("Invalid path");
          const server = this.getServer(serverName);
          const serverId = server.id;
          this.checkAccess(authenticatedUser, serverId);
          const safePath = this.fileManagerService.resolveSafePath(
            serverId,
            subpath,
          );
          const dir = resolve(safePath, "..");
          await fs.mkdir(dir, { recursive: true });
          success(createWriteStream(safePath));
        } catch (err) {
          failure(err);
        }
      });

      connection.on("command:dele", async (path, success, failure) => {
        if (!authenticatedUser) return failure(new Error("Not authenticated"));
        try {
          await this.handleUnlink(path, authenticatedUser);
          success();
        } catch (err) {
          failure(err);
        }
      });

      connection.on("command:mkd", async (path, success, failure) => {
        if (!authenticatedUser) return failure(new Error("Not authenticated"));
        try {
          await this.handleMkdir(path, authenticatedUser);
          success();
        } catch (err) {
          failure(err);
        }
      });

      connection.on("command:rmd", async (path, success, failure) => {
        if (!authenticatedUser) return failure(new Error("Not authenticated"));
        try {
          await this.handleRmdir(path, authenticatedUser);
          success();
        } catch (err) {
          failure(err);
        }
      });

      connection.on("command:rnfr", (path, success, failure) => {
        if (!authenticatedUser) return failure(new Error("Not authenticated"));
        connection._rnfr = path;
        success();
      });

      connection.on("command:rnto", async (path, success, failure) => {
        if (!authenticatedUser) return failure(new Error("Not authenticated"));
        if (!connection._rnfr) return failure(new Error("RNFR not set"));
        try {
          await this.handleRename(connection._rnfr, path, authenticatedUser);
          delete connection._rnfr;
          success();
        } catch (err) {
          failure(err);
        }
      });
    });

    this.server.listen(port);
  }

  public checkAccess(user: IUser, serverId?: string): void {
    if (!user.permissions.includes(UserPermissions.FILE_MANAGER)) {
      throw new Error("Access denied: FILE_MANAGER permission required");
    }
    if (
      serverId &&
      user.serversRestrict.enabled &&
      !user.serversRestrict.allowed.includes(serverId)
    ) {
      throw new Error("Access denied: server not allowed");
    }
  }

  public parsePath(path: string): { serverName?: string; subpath: string } {
    const parts = path.split("/").filter((p) => p);
    if (parts.length === 0) {
      return { subpath: "/" };
    }
    return {
      serverName: parts[0],
      subpath: parts.length > 1 ? "/" + parts.slice(1).join("/") : "/",
    };
  }

  public getServer(serverName: string): IServer {
    const server =
      this.serversService.findByName(serverName) ||
      this.serversService.findById(serverName);
    if (!server) {
      throw new Error("Server not found");
    }
    return server;
  }

  public async handleReaddir(path: string, user: IUser): Promise<any[]> {
    if (path === "/") {
      const servers = this.serversService.findAll();
      const allowedServers = servers.filter((server) => {
        if (user.serversRestrict.enabled) {
          return user.serversRestrict.allowed.includes(server.id);
        }
        return true;
      });
      return allowedServers.map((server) => ({
        name: server.name,
        type: "directory",
      }));
    }

    const { serverName, subpath } = this.parsePath(path);
    if (!serverName) throw new Error("Invalid path");
    const server = this.getServer(serverName);
    const serverId = server.id;
    this.checkAccess(user, serverId);

    const files = await this.fileManagerService.scanDirectory(
      serverId,
      subpath,
    );
    return files.map((file) => ({
      name: file.name,
      type: file.type === "directory" ? "directory" : "file",
      size: file.size,
      modify: file.modify,
    }));
  }

  public async handleStat(path: string, user: IUser): Promise<any> {
    this.checkAccess(user);

    if (path === "/") {
      return { isDirectory: () => true, size: 0, mtime: new Date() };
    }

    const { serverName, subpath } = this.parsePath(path);
    if (!serverName) throw new Error("Invalid path");
    const server = this.getServer(serverName);
    const serverId = server.id;
    this.checkAccess(user, serverId);

    if (subpath === "/") {
      return { isDirectory: () => true, size: 0, mtime: new Date() };
    }

    try {
      await this.fileManagerService.scanDirectory(serverId, subpath);
      return { isDirectory: () => true, size: 0, mtime: new Date() };
    } catch {
      try {
        const buffer = await this.fileManagerService.readFile(
          serverId,
          subpath,
        );
        return {
          isDirectory: () => false,
          size: buffer.length,
          mtime: new Date(),
        };
      } catch {
        throw new Error("Path not found");
      }
    }
  }

  public async handleReadFile(path: string, user: IUser): Promise<Buffer> {
    const { serverName, subpath } = this.parsePath(path);
    if (!serverName || subpath === "/") throw new Error("Invalid path");
    const server = this.getServer(serverName);
    const serverId = server.id;
    this.checkAccess(user, serverId);
    return await this.fileManagerService.readFile(serverId, subpath);
  }

  public async handleWriteFile(
    path: string,
    data: string,
    user: IUser,
  ): Promise<void> {
    const { serverName, subpath } = this.parsePath(path);
    if (!serverName || subpath === "/") throw new Error("Invalid path");
    const server = this.getServer(serverName);
    const serverId = server.id;
    this.checkAccess(user, serverId);
    await this.fileManagerService.writeFile(serverId, subpath, data);
  }

  public async handleMkdir(path: string, user: IUser): Promise<void> {
    const { serverName, subpath } = this.parsePath(path);
    if (!serverName || subpath === "/") throw new Error("Invalid path");
    const server = this.getServer(serverName);
    const serverId = server.id;
    this.checkAccess(user, serverId);
    const parent = subpath.substring(0, subpath.lastIndexOf("/")) || "/";
    const name = subpath.substring(subpath.lastIndexOf("/") + 1);
    await this.fileManagerService.createDirectory(serverId, parent, name);
  }

  public async handleRmdir(path: string, user: IUser): Promise<void> {
    const { serverName, subpath } = this.parsePath(path);
    if (!serverName || subpath === "/") throw new Error("Invalid path");
    const server = this.getServer(serverName);
    const serverId = server.id;
    this.checkAccess(user, serverId);
    await this.fileManagerService.deleteDirectory(serverId, subpath);
  }

  public async handleUnlink(path: string, user: IUser): Promise<void> {
    const { serverName, subpath } = this.parsePath(path);
    if (!serverName || subpath === "/") throw new Error("Invalid path");
    const server = this.getServer(serverName);
    const serverId = server.id;
    this.checkAccess(user, serverId);
    await this.fileManagerService.deleteFile(serverId, subpath);
  }

  public async handleRename(
    oldPath: string,
    newPath: string,
    user: IUser,
  ): Promise<void> {
    const oldParsed = this.parsePath(oldPath);
    const newParsed = this.parsePath(newPath);
    if (
      !oldParsed.serverName ||
      !newParsed.serverName ||
      oldParsed.serverName !== newParsed.serverName
    ) {
      throw new Error("Rename across servers not supported");
    }
    const server = this.getServer(oldParsed.serverName);
    const serverId = server.id;
    this.checkAccess(user, serverId);
    const oldName = oldParsed.subpath.split("/").pop()!;
    const newName = newParsed.subpath.split("/").pop()!;
    if (oldParsed.subpath !== newParsed.subpath.replace(newName, oldName)) {
      throw new Error("Rename to different directory not supported");
    }
    await this.fileManagerService.renameFile(
      serverId,
      oldParsed.subpath,
      newName,
    );
  }
}
