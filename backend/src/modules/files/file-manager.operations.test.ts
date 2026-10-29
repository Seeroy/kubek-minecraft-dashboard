import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { FileType } from "@shared/types/file.types";
import type { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import { fake } from "@/testing/fake";
import { FileBatchService } from "./file-batch.service";
import { FileManagerService } from "./file-manager.service";

let cwd: string;
let root: string;
let server: string;
let published: { event: string; payload: unknown }[];
let files: FileManagerService;
const batch = new FileBatchService();

const upload = (name: string, content = "up") =>
  fake<Express.Multer.File>({
    originalname: name,
    buffer: Buffer.from(content),
  });

function put(relative: string, content = "x") {
  const full = join(server, relative);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, content);
}

const read = (relative: string) => readFileSync(join(server, relative), "utf8");
const exists = (relative: string) => existsSync(join(server, relative));

beforeEach(() => {
  cwd = process.cwd();
  root = realpathSync(mkdtempSync(join(tmpdir(), "kubek-files-ops-")));
  process.chdir(root);
  server = join(root, "servers", "srv");
  mkdirSync(server, { recursive: true });
  mkdirSync(join(root, "outside"));
  writeFileSync(join(root, "outside", "secret.txt"), "secret");
  published = [];
  files = new FileManagerService(
    fake<ExtensionEventBus>({
      publish: (event: string, payload: unknown) => {
        published.push({ event, payload });
      },
    }),
  );
});

afterEach(() => {
  process.chdir(cwd);
  rmSync(root, { recursive: true, force: true });
});

describe("path jail", () => {
  test("rejects server ids that are not a single folder name", async () => {
    for (const id of ["", "..", "../srv", "a/b", "a\\b"]) {
      await expect(files.readFile(id, "a.txt")).rejects.toThrow(
        "Invalid server id",
      );
    }
  });

  test("rejects paths that climb out with ..", async () => {
    for (const path of ["../outside/secret.txt", "a/../../x", "../../.."]) {
      await expect(files.readFile("srv", path)).rejects.toThrow(
        "directory traversal",
      );
      await expect(files.writeFile("srv", path, "x")).rejects.toThrow(
        BadRequestException,
      );
    }
    expect(readFileSync(join(root, "outside", "secret.txt"), "utf8")).toBe(
      "secret",
    );
  });

  test("treats an absolute path as relative to the server folder", async () => {
    await files.writeFile("srv", "/abs.txt", "inside");
    expect(read("abs.txt")).toBe("inside");
    expect(existsSync("/abs.txt")).toBe(false);
  });

  test("does not decode url encoded dots", async () => {
    await files.writeFile("srv", "%2e%2e/x.txt", "kept");
    expect(read("%2e%2e/x.txt")).toBe("kept");
    expect(existsSync(join(root, "servers", "x.txt"))).toBe(false);
  });

  test("resolveSafePath returns the absolute path inside the server", () => {
    expect(files.resolveSafePath("srv", "config/a.yml")).toBe(
      join(server, "config", "a.yml"),
    );
    expect(files.resolveSafePath("srv")).toBe(server);
  });
});

describe("scanDirectory", () => {
  test("lists folders first, then files, each sorted by name", async () => {
    put("b.txt", "12345");
    put("a.txt");
    put("world/level.dat");
    put("plugins/x.jar");

    const list = await files.scanDirectory("srv", "");

    expect(list.map((f) => [f.name, f.type])).toEqual([
      ["plugins", FileType.DIRECTORY],
      ["world", FileType.DIRECTORY],
      ["a.txt", FileType.FILE],
      ["b.txt", FileType.FILE],
    ]);
    expect(list.find((f) => f.name === "b.txt")?.size).toBe(5);
  });

  test("lists a folder bigger than one stat batch with sizes", async () => {
    for (let i = 0; i < 150; i++) put(`many/f${i}.txt`, "x".repeat(i));

    const list = await files.scanDirectory("srv", "many");

    expect(list).toHaveLength(150);
    expect(list.find((f) => f.name === "f149.txt")?.size).toBe(149);
  });

  test("returns paths relative to the server folder", async () => {
    put("world/region/r.0.0.mca");
    const list = await files.scanDirectory("srv", "world");
    expect(list.map((f) => f.path)).toEqual([join("world", "region")]);
  });

  test("fails for a missing folder or a file", async () => {
    put("a.txt");
    await expect(files.scanDirectory("srv", "nope")).rejects.toThrow(
      NotFoundException,
    );
    await expect(files.scanDirectory("srv", "a.txt")).rejects.toThrow(
      "Directory not found",
    );
  });
});

describe("searchFiles", () => {
  test("finds names case insensitively in nested folders", async () => {
    put("Config.yml");
    put("plugins/Essentials/config.yml");
    put("plugins/other.txt");
    mkdirSync(join(server, "configs"));

    const found = await files.searchFiles("srv", "  CONFIG ");

    expect(found.map((f) => f.path)).toEqual([
      "configs",
      join("plugins", "Essentials", "config.yml"),
      "Config.yml",
    ]);
  });

  test("searches only under the given folder", async () => {
    put("a/match.txt");
    put("b/match.txt");
    const found = await files.searchFiles("srv", "match", "b");
    expect(found.map((f) => f.path)).toEqual([join("b", "match.txt")]);
  });

  test("returns nothing for a blank query", async () => {
    put("a.txt");
    expect(await files.searchFiles("srv", "   ")).toEqual([]);
  });

  test("does not follow links out of the server", async () => {
    symlinkSync(join(root, "outside"), join(server, "escape"));
    expect(await files.searchFiles("srv", "secret")).toEqual([]);
  });

  test("a matching link is not listed either", async () => {
    symlinkSync(join(root, "outside"), join(server, "secret-dir"));
    expect(await files.searchFiles("srv", "secret")).toEqual([]);
  });

  test("rejects a base folder outside the server", async () => {
    await expect(files.searchFiles("srv", "secret", "..")).rejects.toThrow(
      "directory traversal",
    );
  });
});

describe("readFile and writeFile", () => {
  test("reads file bytes as they are on disk", async () => {
    writeFileSync(join(server, "icon.png"), Buffer.from([0, 255, 10, 13]));
    expect([...(await files.readFile("srv", "icon.png"))]).toEqual([
      0, 255, 10, 13,
    ]);
  });

  test("reading a missing file or a folder is not found", async () => {
    mkdirSync(join(server, "world"));
    await expect(files.readFile("srv", "nope.txt")).rejects.toThrow(
      "File not found",
    );
    await expect(files.readFile("srv", "world")).rejects.toThrow(
      NotFoundException,
    );
  });

  test("writing creates missing folders and reports the change", async () => {
    await files.writeFile("srv", "plugins/x/config.yml", "a: 1");
    expect(read("plugins/x/config.yml")).toBe("a: 1");
    expect(published).toEqual([
      {
        event: "file.changed",
        payload: { serverId: "srv", path: "plugins/x/config.yml" },
      },
    ]);
  });

  test("writing replaces the old content", async () => {
    put("server.properties", "motd=old\nmax-players=20");
    await files.writeFile("srv", "server.properties", "motd=new");
    expect(read("server.properties")).toBe("motd=new");
  });

  test("writing into a server folder that does not exist yet creates it", async () => {
    await files.writeFile("fresh", "eula.txt", "eula=true");
    expect(
      readFileSync(join(root, "servers", "fresh", "eula.txt"), "utf8"),
    ).toBe("eula=true");
  });
});

describe("deleteFile and deleteDirectory", () => {
  test("deletes a single file", async () => {
    put("logs/latest.log");
    await files.deleteFile("srv", "logs/latest.log");
    expect(exists("logs/latest.log")).toBe(false);
    expect(exists("logs")).toBe(true);
  });

  test("deleteFile refuses folders and missing files", async () => {
    put("world/level.dat");
    await expect(files.deleteFile("srv", "world")).rejects.toThrow(
      "use deleteDirectory",
    );
    await expect(files.deleteFile("srv", "nope.txt")).rejects.toThrow(
      NotFoundException,
    );
    expect(exists("world/level.dat")).toBe(true);
  });

  test("deletes a folder with everything inside", async () => {
    put("world/region/r.0.0.mca");
    put("world/level.dat");
    await files.deleteDirectory("srv", "world");
    expect(exists("world")).toBe(false);
  });

  test("deleteDirectory refuses files and missing folders", async () => {
    put("a.txt");
    await expect(files.deleteDirectory("srv", "a.txt")).rejects.toThrow(
      "Directory not found",
    );
    await expect(files.deleteDirectory("srv", "nope")).rejects.toThrow(
      NotFoundException,
    );
    expect(exists("a.txt")).toBe(true);
  });

  test("cannot delete the folder above the server", async () => {
    await expect(files.deleteDirectory("srv", "..")).rejects.toThrow(
      "directory traversal",
    );
    expect(existsSync(join(root, "servers"))).toBe(true);
  });
});

describe("renameFile", () => {
  test("renames a file in its folder", async () => {
    put("plugins/old.jar", "jar");
    await files.renameFile("srv", "plugins/old.jar", "new.jar");
    expect(exists("plugins/old.jar")).toBe(false);
    expect(read("plugins/new.jar")).toBe("jar");
  });

  test("renames a folder with its content", async () => {
    put("world/level.dat", "lvl");
    await files.renameFile("srv", "world", "world_old");
    expect(read("world_old/level.dat")).toBe("lvl");
  });

  test("a new name with .. may move the file up while it stays inside", async () => {
    put("plugins/a.txt", "a");
    await files.renameFile("srv", "plugins/a.txt", "../a.txt");
    expect(read("a.txt")).toBe("a");
  });

  test("a new name pointing out of the server is rejected", async () => {
    put("a.txt", "a");
    await expect(
      files.renameFile("srv", "a.txt", "../../outside/stolen.txt"),
    ).rejects.toThrow("directory traversal");
    expect(read("a.txt")).toBe("a");
    expect(existsSync(join(root, "outside", "stolen.txt"))).toBe(false);
  });

  test("renaming a missing file is not found", async () => {
    await expect(files.renameFile("srv", "nope", "x")).rejects.toThrow(
      "File or directory not found",
    );
  });
});

describe("createDirectory", () => {
  test("creates a folder, nested names included", async () => {
    await files.createDirectory("srv", "", "plugins");
    await files.createDirectory("srv", "plugins", "a/b");
    expect(readdirSync(join(server, "plugins", "a"))).toEqual(["b"]);
  });

  test("refuses a folder that already exists", async () => {
    mkdirSync(join(server, "world"));
    await expect(files.createDirectory("srv", "", "world")).rejects.toThrow(
      "Directory already exists",
    );
  });

  test("refuses a name that climbs out of the server", async () => {
    await expect(
      files.createDirectory("srv", "", "../../outside/made"),
    ).rejects.toThrow("directory traversal");
    expect(existsSync(join(root, "outside", "made"))).toBe(false);
  });
});

describe("deletePaths", () => {
  test("deletes files and folders and reports progress once per unique path", async () => {
    put("a.txt");
    put("world/level.dat");
    const progress: [number, number, string][] = [];

    await batch.deletePaths("srv", ["a.txt", "world/", "a.txt"], (d, t, n) =>
      progress.push([d, t, n]),
    );

    expect(readdirSync(server)).toEqual([]);
    expect(progress).toEqual([
      [1, 2, "a.txt"],
      [2, 2, "world"],
    ]);
  });

  test("keeps going past failures and lists them at the end", async () => {
    put("a.txt");
    put("b.txt");

    await expect(
      batch.deletePaths("srv", ["a.txt", "ghost.txt", "../outside", "b.txt"]),
    ).rejects.toThrow(
      /^Failed to delete 2\/4: ghost\.txt \(not found\), outside \(/,
    );

    expect(readdirSync(server)).toEqual([]);
    expect(existsSync(join(root, "outside", "secret.txt"))).toBe(true);
  });
});

describe("zip archives", () => {
  test("archives a selection and extracts it back next to the archive", async () => {
    put("world/level.dat", "level");
    put("world/region/r.0.0.mca", "region");
    put("server.properties", "motd=hi");

    const created = await batch.createZipArchive(
      "srv",
      ["world", "world/level.dat", "server.properties"],
      "",
      "backup",
    );
    expect(created).toEqual({ archivePath: "backup.zip" });
    expect(exists("backup.zip.part")).toBe(false);

    mkdirSync(join(server, "restore"));
    await files.renameFile("srv", "backup.zip", "restore/backup.zip");
    const extracted = await batch.extractZipArchive(
      "srv",
      "restore/backup.zip",
    );

    expect(extracted).toEqual({ extractPath: "restore" });
    expect(read("restore/world/level.dat")).toBe("level");
    expect(read("restore/world/region/r.0.0.mca")).toBe("region");
    expect(read("restore/server.properties")).toBe("motd=hi");
  });

  test("extracting into the server root returns an empty path", async () => {
    put("a.txt", "a");
    await batch.createZipArchive("srv", ["a.txt"], "", "one");
    await files.deleteFile("srv", "a.txt");
    expect(await batch.extractZipArchive("srv", "one.zip")).toEqual({
      extractPath: "",
    });
    expect(read("a.txt")).toBe("a");
  });

  test("refuses to create an archive over an existing one", async () => {
    put("a.txt");
    put("old.zip", "keep");
    await expect(
      batch.createZipArchive("srv", ["a.txt"], "", "old"),
    ).rejects.toThrow("Archive file already exists");
    expect(read("old.zip")).toBe("keep");
  });

  test("rejects an empty selection, a missing source or destination", async () => {
    put("a.txt");
    mkdirSync(join(server, "empty"));
    await expect(batch.createZipArchive("srv", [], "", "x")).rejects.toThrow(
      "At least one path is required",
    );
    await expect(
      batch.createZipArchive("srv", ["a.txt"], "nope", "x"),
    ).rejects.toThrow("Destination directory not found");
    await expect(
      batch.createZipArchive("srv", ["ghost.txt"], "", "x"),
    ).rejects.toThrow("Source not found: ghost.txt");
    await expect(
      batch.createZipArchive("srv", ["empty"], "", "x"),
    ).rejects.toThrow("No files to archive");
    expect(exists("x.zip")).toBe(false);
  });

  test("rejects sources outside the server", async () => {
    await expect(
      batch.createZipArchive("srv", ["../outside/secret.txt"], "", "x"),
    ).rejects.toThrow("directory traversal");
  });

  test("extracts only existing .zip files", async () => {
    put("data.tar.gz");
    await expect(batch.extractZipArchive("srv", "data.tar.gz")).rejects.toThrow(
      "Only .zip archives can be extracted",
    );
    await expect(batch.extractZipArchive("srv", "nope.zip")).rejects.toThrow(
      "Archive file not found",
    );
  });

  test("reports progress while compressing", async () => {
    put("a.txt", "a".repeat(10_000));
    const calls: [number, number, string][] = [];
    await batch.createZipArchive("srv", ["a.txt"], "", "p", (d, t, n) =>
      calls.push([d, t, n]),
    );
    expect(calls.length).toBeGreaterThan(0);
    expect(
      calls.every(([d, t, n]) => d <= t && t === 10_000 && n === "p.zip"),
    ).toBe(true);
  });
});

describe("uploadFile", () => {
  test("stores the file and creates the target folder", async () => {
    await files.uploadFile("srv", "plugins", upload("x.jar", "jar"));
    expect(read("plugins/x.jar")).toBe("jar");
  });

  test("never overwrites an existing file", async () => {
    put("plugins/x.jar", "original");
    await expect(
      files.uploadFile("srv", "plugins", upload("x.jar", "new")),
    ).rejects.toThrow("File already exists");
    expect(read("plugins/x.jar")).toBe("original");
  });

  test("rejects a file name that climbs out of the server", async () => {
    await expect(
      files.uploadFile("srv", "", upload("../../outside/evil.txt")),
    ).rejects.toThrow("directory traversal");
    expect(existsSync(join(root, "outside", "evil.txt"))).toBe(false);
  });
});
