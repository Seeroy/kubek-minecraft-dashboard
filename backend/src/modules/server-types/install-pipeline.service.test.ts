import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from "bun:test";
import { pack } from "@/core/utils/archives";
import { DownloadError } from "@/core/utils/download";
import { Branding } from "@/core/constants/branding";
import { AppEventsService } from "@/core/events/app-events.service";
import type { ExtensionEventBus } from "@/modules/extensions/extension-event-bus.service";
import type { JavaService } from "@/modules/java/java.service";
import { TasksService } from "@/modules/tasks/tasks.service";
import { fake } from "@/testing/fake";
import type { TasksEventsService } from "@/ws/services/task-events.service";
import type {
  InstallStep,
  KubekBlueprintManifest,
} from "@kubekpanel/blueprint-sdk";
import { type IServer, ServerStatus } from "@shared/types/server/server.types";
import { type ITask, TaskSteps, TaskType } from "@shared/types/task.types";
import type Docker from "dockerode";
import type DockerModem from "docker-modem";
import fs from "fs";
import os from "os";
import path from "path";
import { Readable } from "stream";
import { BlueprintResolver } from "./blueprint-resolver.service";
import { InstallPipeline } from "./install-pipeline.service";
import type { DockerService } from "./runtime/docker.service";
import type { LoadedBlueprint } from "./server-types.types";
import type {
  SteamCmdProgress,
  SteamCmdService,
} from "./steamcmd/steamcmd.service";
import type { VersionResolverService } from "./versions/version-resolver.service";

let zipBytes: Buffer;
let http: ReturnType<typeof Bun.serve>;
let downloads: string[];

beforeAll(async () => {
  const src = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-pipeline-zip-"));
  fs.mkdirSync(path.join(src, "libraries"));
  fs.writeFileSync(path.join(src, "libraries", "lib.jar"), "lib");
  fs.writeFileSync(path.join(src, "run.sh"), "java -jar server.jar");
  const zip = path.join(os.tmpdir(), `kubek-pipeline-${process.pid}.zip`);
  await pack([{ path: src, ignoreBase: true }], zip);
  zipBytes = fs.readFileSync(zip);
  fs.rmSync(src, { recursive: true, force: true });
  fs.rmSync(zip, { force: true });

  http = Bun.serve({
    port: 0,
    hostname: "127.0.0.1",
    fetch(req) {
      const { pathname } = new URL(req.url);
      downloads.push(pathname);
      if (pathname.endsWith(".zip"))
        return new Response(new Uint8Array(zipBytes));
      if (pathname === "/broken") return new Response("not a zip");
      if (pathname === "/missing") return new Response("nope", { status: 404 });
      return new Response(`jar from ${pathname}`);
    },
  });
});

afterAll(() => {
  void http.stop(true);
});

const url = (p: string) => `http://127.0.0.1:${http.port}${p}`;

function manifest(
  overrides: Partial<KubekBlueprintManifest> = {},
): KubekBlueprintManifest {
  return {
    manifestVersion: 1,
    id: "test.core",
    name: "Test core",
    game: "test",
    version: "1.0.0",
    runtime: { kind: "native" },
    variables: [{ key: "MOTD", type: "string", default: "hello" }],
    versions: { kind: "none" },
    install: { steps: [] },
    startup: { command: "run", stop: { type: "command", value: "stop" } },
    query: { protocol: "none", port: { value: 0 } },
    ports: [{ key: "game", default: 25565, protocol: "tcp", primary: true }],
    ...overrides,
  };
}

const steps = (...list: InstallStep[]) =>
  manifest({ install: { steps: list } });

let cwd: string;
let root: string;
let blueprintDir: string;
let tasks: TasksService;
let taskId: string;
let updates: Partial<ITask>[];
let managedJava: string | null;
let javaInstalls: string[];
let customJava: string | null;
let dockerAvailable: boolean;
let pulled: string[];
let downloadVars: Record<string, string> | undefined;
let steamApps: { step: object; dir: string }[];
let pipeline: InstallPipeline;

const server = (overrides: Partial<IServer> = {}): IServer => ({
  id: "srv",
  name: "My server",
  status: ServerStatus.STOPPED,
  restartOnError: { enabled: true, attempts: 3 },
  blueprintId: "test.core",
  variables: { MOTD: "welcome" },
  runtimeKind: "native",
  ...overrides,
});

const loaded = (m: KubekBlueprintManifest): LoadedBlueprint => ({
  manifest: m,
  dir: blueprintDir,
  source: "installed",
  valid: true,
  errors: [],
});

const serverFile = (...p: string[]) => path.join(root, "servers", "srv", ...p);
const stepsSeen = () => updates.map((u) => u.step).filter(Boolean);

function pullOf(image: string): Docker["pull"] {
  // Matches both dockerode overloads, the pipeline only uses the promise one
  function pull(
    repoTag: string,
    options: object,
    callback: (error?: unknown, result?: NodeJS.ReadableStream) => void,
    auth?: object,
  ): Docker.Image;
  function pull(
    repoTag: string,
    options?: object,
  ): Promise<NodeJS.ReadableStream>;
  function pull(
    repoTag: string,
  ): Promise<NodeJS.ReadableStream> | Docker.Image {
    pulled.push(repoTag);
    expect(repoTag).toBe(image);
    return Promise.resolve(Readable.from([]));
  }
  return pull;
}

function dockerWith(
  image: string,
  events: object[],
  error: Error | null = null,
): Docker {
  return fake<Docker>({
    pull: pullOf(image),
    modem: fake<DockerModem>({
      followProgress: (_stream, onFinished, onProgress) => {
        for (const event of events) onProgress?.(event);
        onFinished(error, []);
      },
    }),
  });
}

let docker: Docker;

beforeEach(() => {
  cwd = process.cwd();
  root = fs.mkdtempSync(path.join(os.tmpdir(), "kubek-pipeline-"));
  process.chdir(root);
  blueprintDir = path.join(root, "blueprint");
  fs.mkdirSync(blueprintDir);

  downloads = [];
  updates = [];
  managedJava = "/opt/java21/bin/java";
  javaInstalls = [];
  customJava = null;
  dockerAvailable = true;
  pulled = [];
  downloadVars = undefined;
  steamApps = [];
  docker = dockerWith("img:latest", []);

  tasks = new TasksService(
    fake<TasksEventsService>({
      emitTaskUpdate: () => {},
      emitTaskDone: () => {},
      emitTaskFailed: () => {},
    }),
    fake<ExtensionEventBus>({ publish: () => {} }),
    new AppEventsService(),
  );
  taskId = tasks.createTask(TaskType.SERVER_CREATE);
  tasks.watch(taskId, (task) =>
    updates.push({
      step: task.step,
      progress: task.progress,
      message: task.message,
    }),
  );

  const resolver = new BlueprintResolver();
  pipeline = new InstallPipeline(
    fake<VersionResolverService>({
      resolveDownload: (_bp, version) =>
        Promise.resolve({
          url: url(`/core-${version}.jar`),
          vars: downloadVars,
        }),
    }),
    resolver,
    fake<JavaService>({
      getManagedJavaPath: () => Promise.resolve(managedJava),
      installJavaVersion: (version) => {
        javaInstalls.push(version);
        return Promise.resolve({ success: false });
      },
      resolveJavaBinary: () => Promise.resolve(customJava),
    }),
    tasks,
    fake<DockerService>({
      assertAvailable: () =>
        dockerAvailable
          ? Promise.resolve()
          : Promise.reject(new Error("Docker is not reachable")),
      getDocker: () => docker,
    }),
    fake<SteamCmdService>({
      installApp: (step, dir, onProgress?: (p: SteamCmdProgress) => void) => {
        steamApps.push({ step, dir });
        onProgress?.({ phase: "downloading", percent: 42.5 });
        return Promise.resolve();
      },
    }),
  );
});

afterEach(() => {
  process.chdir(cwd);
  fs.rmSync(root, { recursive: true, force: true });
});

describe("InstallPipeline file steps", () => {
  test("steps run in order with substitutions from the server", async () => {
    const m = steps(
      { type: "writeFile", path: "eula.txt", content: "eula=false" },
      { type: "writeFile", path: "eula.txt", content: "eula=true" },
      {
        type: "writeFile",
        path: "info.txt",
        content: "{{SERVER_NAME}} {{MOTD}} {{SERVER_PORT}}",
      },
    );

    await pipeline.run(loaded(m), server(), taskId);

    expect(fs.readFileSync(serverFile("eula.txt"), "utf8")).toBe("eula=true");
    expect(fs.readFileSync(serverFile("info.txt"), "utf8")).toBe(
      "My server welcome 25565",
    );
  });

  test("templates are read from the blueprint folder and substituted", async () => {
    fs.writeFileSync(
      path.join(blueprintDir, "server.properties.tpl"),
      "motd={{MOTD}}\nserver-port={{SERVER_PORT}}",
    );
    const m = steps({
      type: "template",
      src: "server.properties.tpl",
      dest: "server.properties",
    });

    await pipeline.run(
      loaded(m),
      server({ variables: { MOTD: "hey", game: 25600 } }),
    );

    expect(fs.readFileSync(serverFile("server.properties"), "utf8")).toBe(
      "motd=hey\nserver-port=25600",
    );
  });

  test("chmod applies to a file an earlier step wrote", async () => {
    const m = steps(
      { type: "writeFile", path: "start.sh", content: "#!/bin/sh" },
      { type: "chmod", path: "start.sh", mode: "755" },
    );

    await pipeline.run(loaded(m), server());

    expect(fs.statSync(serverFile("start.sh")).mode & 0o777).toBe(0o755);
  });

  test("file steps can't leave the server folder", async () => {
    for (const step of [
      { type: "writeFile", path: "../evil.txt", content: "x" },
      { type: "writeFile", path: "{{MOTD}}", content: "x" },
      { type: "template", src: "../evil.txt", dest: "copy.txt" },
      { type: "chmod", path: "../../evil.txt", mode: "777" },
    ] as const) {
      await expect(
        pipeline.run(
          loaded(steps(step)),
          server({ variables: { MOTD: "../../evil.txt" } }),
        ),
      ).rejects.toThrow("Install step path leaves its folder");
    }
    expect(fs.existsSync(path.join(root, "servers", "evil.txt"))).toBe(false);
    expect(fs.existsSync(path.join(root, "evil.txt"))).toBe(false);
  });

  test("file steps can't write through a link out of the server", async () => {
    const outside = path.join(root, "outside");
    fs.mkdirSync(outside);
    fs.mkdirSync(serverFile(), { recursive: true });
    fs.symlinkSync(outside, serverFile("escape"));

    await expect(
      pipeline.run(
        loaded(
          steps({ type: "writeFile", path: "escape/x.txt", content: "x" }),
        ),
        server(),
      ),
    ).rejects.toThrow("Install step path leaves its folder");
    expect(fs.existsSync(path.join(outside, "x.txt"))).toBe(false);
  });

  test("an unsupported step fails the install and later steps never run", async () => {
    const m = steps(
      { type: "writeFile", path: "before.txt", content: "1" },
      { type: "script", shell: "sh", inline: "echo hi" },
      { type: "writeFile", path: "after.txt", content: "2" },
    );

    await expect(pipeline.run(loaded(m), server())).rejects.toThrow(
      "Unsupported install step: script",
    );

    expect(fs.existsSync(serverFile("before.txt"))).toBe(true);
    expect(fs.existsSync(serverFile("after.txt"))).toBe(false);
  });

  test("re-provisioning keeps files the user already has", async () => {
    fs.mkdirSync(serverFile(), { recursive: true });
    fs.writeFileSync(serverFile("server.properties"), "motd=mine");
    fs.writeFileSync(path.join(blueprintDir, "props.tpl"), "motd=default");
    const m = steps(
      { type: "template", src: "props.tpl", dest: "server.properties" },
      { type: "writeFile", path: "eula.txt", content: "eula=true" },
    );

    await pipeline.run(loaded(m), server(), undefined, {
      skipExistingFiles: true,
    });

    expect(fs.readFileSync(serverFile("server.properties"), "utf8")).toBe(
      "motd=mine",
    );
    expect(fs.readFileSync(serverFile("eula.txt"), "utf8")).toBe("eula=true");
  });

  test("without skipExistingFiles the template overwrites", async () => {
    fs.mkdirSync(serverFile(), { recursive: true });
    fs.writeFileSync(serverFile("server.properties"), "motd=mine");
    fs.writeFileSync(path.join(blueprintDir, "props.tpl"), "motd=default");

    await pipeline.run(
      loaded(
        steps({
          type: "template",
          src: "props.tpl",
          dest: "server.properties",
        }),
      ),
      server(),
    );

    expect(fs.readFileSync(serverFile("server.properties"), "utf8")).toBe(
      "motd=default",
    );
  });

  test("minecraft servers get the default icon once, a custom one stays", async () => {
    await pipeline.run(loaded(manifest({ game: "minecraft" })), server());
    expect(fs.readFileSync(serverFile("server-icon.png"))).toEqual(
      Buffer.from(Branding.Base64Icon, "base64"),
    );

    fs.writeFileSync(serverFile("server-icon.png"), "custom");
    await pipeline.run(loaded(manifest({ game: "minecraft" })), server());
    expect(fs.readFileSync(serverFile("server-icon.png"), "utf8")).toBe(
      "custom",
    );
  });

  test("other games get no icon", async () => {
    await pipeline.run(loaded(manifest()), server());
    expect(fs.readdirSync(serverFile())).toEqual([]);
  });
});

describe("InstallPipeline downloads", () => {
  test("the download url is resolved from the chosen version", async () => {
    const m = manifest({
      versions: { kind: "static", versions: [] },
      variables: [
        { key: "GAME_VERSION", type: "string", options: { from: "versions" } },
      ],
      install: {
        steps: [
          { type: "download", url: "{{DOWNLOAD_URL}}", dest: "server.jar" },
        ],
      },
    });

    await pipeline.run(
      loaded(m),
      server({ variables: { GAME_VERSION: "1.21.4" } }),
      taskId,
    );

    expect(fs.readFileSync(serverFile("server.jar"), "utf8")).toBe(
      "jar from /core-1.21.4.jar",
    );
    expect(stepsSeen()).toContain(TaskSteps.DOWNLOADING_CORE);
  });

  test("an archive download is unpacked into the server folder and removed", async () => {
    const m = steps({
      type: "download",
      url: url("/pack.zip"),
      dest: "pack.zip",
      unpack: true,
    });

    await pipeline.run(loaded(m), server());

    expect(fs.readFileSync(serverFile("libraries", "lib.jar"), "utf8")).toBe(
      "lib",
    );
    expect(fs.existsSync(serverFile("pack.zip"))).toBe(false);
  });

  test("a broken archive fails the install instead of leaving an empty server", async () => {
    const m = steps({
      type: "download",
      url: url("/broken"),
      dest: "pack.zip",
      unpack: true,
    });

    await expect(pipeline.run(loaded(m), server())).rejects.toThrow(
      "Failed to unpack pack.zip",
    );
  });

  test("an http error fails the install", async () => {
    const m = steps(
      { type: "download", url: url("/missing"), dest: "server.jar" },
      { type: "writeFile", path: "eula.txt", content: "eula=true" },
    );

    await expect(pipeline.run(loaded(m), server())).rejects.toBeInstanceOf(
      DownloadError,
    );
    expect(fs.existsSync(serverFile("eula.txt"))).toBe(false);
  });

  test("a url that resolves to nothing fails before any request", async () => {
    const m = steps({ type: "download", url: "{{NOPE}}", dest: "server.jar" });

    await expect(pipeline.run(loaded(m), server())).rejects.toThrow(
      "Download step has no resolved URL",
    );
    expect(downloads).toEqual([]);
  });
});

describe("InstallPipeline java", () => {
  const javaCore = (...list: InstallStep[]) =>
    manifest({
      variables: [{ key: "JAVA_VERSION", type: "number", default: 21 }],
      install: { steps: list },
    });

  test("managed java that is already there is used without installing", async () => {
    await pipeline.run(
      loaded(javaCore()),
      server({ variables: { JAVA_VERSION: 17 } }),
      taskId,
    );

    expect(javaInstalls).toEqual([]);
    expect(stepsSeen()).toEqual([TaskSteps.CHECKING_JAVA]);
  });

  test("java that cannot be provisioned stops the install before any step", async () => {
    managedJava = null;
    const m = javaCore({
      type: "writeFile",
      path: "eula.txt",
      content: "eula=true",
    });

    await expect(
      pipeline.run(loaded(m), server({ variables: { JAVA_VERSION: 17 } })),
    ).rejects.toThrow("Failed to provision Java 17");
    expect(javaInstalls).toEqual(["17"]);
    expect(fs.existsSync(serverFile("eula.txt"))).toBe(false);
  });

  test("a custom JAVA_PATH skips managed java but must exist", async () => {
    const m = javaCore();

    await expect(
      pipeline.run(
        loaded(m),
        server({ variables: { JAVA_PATH: " /nowhere/java " } }),
      ),
    ).rejects.toThrow("No java binary found at /nowhere/java");

    customJava = "/usr/bin/java";
    managedJava = null;
    await pipeline.run(
      loaded(m),
      server({ variables: { JAVA_PATH: "/usr/bin/java" } }),
    );
    expect(javaInstalls).toEqual([]);
  });
});

describe("InstallPipeline docker", () => {
  const dockerCore = (profile: KubekBlueprintManifest["dockerProfile"]) =>
    manifest({
      dockerProfile: profile,
      install: {
        steps: [{ type: "writeFile", path: "native.txt", content: "native" }],
      },
    });

  test("docker servers pull the profile image instead of the native steps", async () => {
    docker = dockerWith("img:java21", [
      { id: "layer-a", status: "Downloading", progress: "[==>   ]" },
      { id: "layer-a", status: "Pull complete" },
    ]);
    const m = dockerCore({ image: "img:java{{JAVA_VERSION}}", env: {} });
    m.variables.push({ key: "JAVA_VERSION", type: "number", default: 21 });

    await pipeline.run(loaded(m), server({ runtimeKind: "docker" }), taskId);

    expect(pulled).toEqual(["img:java21"]);
    expect(fs.existsSync(serverFile("native.txt"))).toBe(false);
    expect(stepsSeen()).toContain(TaskSteps.PULLING_IMAGE);
    expect(tasks.getTask(taskId)?.progress).toBe(100);
  });

  test("a profile with its own install steps runs those", async () => {
    const m = dockerCore({
      image: "img:latest",
      env: {},
      install: [
        { type: "writeFile", path: "docker.txt", content: "{{SERVER_NAME}}" },
      ],
    });

    await pipeline.run(loaded(m), server({ runtimeKind: "docker" }));

    expect(fs.readFileSync(serverFile("docker.txt"), "utf8")).toBe("My server");
    expect(pulled).toEqual([]);
  });

  test("an unreachable daemon fails the pull", async () => {
    dockerAvailable = false;

    await expect(
      pipeline.run(
        loaded(dockerCore({ image: "img:latest", env: {} })),
        server({ runtimeKind: "docker" }),
      ),
    ).rejects.toThrow("Docker is not reachable");
    expect(pulled).toEqual([]);
  });

  test("a pull error from the daemon fails the install", async () => {
    docker = dockerWith("img:latest", [], new Error("manifest unknown"));

    await expect(
      pipeline.run(
        loaded(dockerCore({ image: "img:latest", env: {} })),
        server({ runtimeKind: "docker" }),
      ),
    ).rejects.toThrow("manifest unknown");
  });
});

describe.skipIf(process.platform === "win32")("InstallPipeline exec", () => {
  const exec = (command: string, extra: object = {}) =>
    ({ type: "exec", command, ...extra }) as InstallStep;
  const failure = (run: Promise<unknown>) =>
    run.then(
      () => "",
      (e: unknown) => (e instanceof Error ? e.message : String(e)),
    );

  test("runs in the server folder with the managed Java", async () => {
    const m = manifest({
      variables: [{ key: "JAVA_VERSION", type: "number", default: 21 }],
      install: {
        steps: [exec('printf "%s|%s" "{{JAVA_BIN}}" "$(pwd)" > out.txt')],
      },
    });

    await pipeline.run(loaded(m), server(), taskId);

    expect(fs.readFileSync(serverFile("out.txt"), "utf8")).toBe(
      `/opt/java21/bin/java|${fs.realpathSync(serverFile())}`,
    );
    expect(stepsSeen()).toContain(TaskSteps.RUNNING_INSTALLER);
  });

  test("takes the command for this OS when there is one", async () => {
    const m = steps(
      exec("echo generic > out.txt", {
        commandByPlatform: { [process.platform]: "echo this-os > out.txt" },
      }),
    );

    await pipeline.run(loaded(m), server());

    expect(fs.readFileSync(serverFile("out.txt"), "utf8").trim()).toBe(
      "this-os",
    );
  });

  test("a failing command fails the install with its output", async () => {
    const m = steps(exec("echo broken installer; exit 3"));

    expect(await failure(pipeline.run(loaded(m), server()))).toMatch(
      /code 3:\nbroken installer/,
    );
  });

  test("a command that runs too long is stopped", async () => {
    const m = steps(exec("sleep 5", { timeoutSec: 0.2 }));

    expect(await failure(pipeline.run(loaded(m), server()))).toContain(
      "did not finish in 0.2s",
    );
  });

  test("user values can't break out of the command", async () => {
    const m = steps(exec("echo {{MOTD}} > out.txt"));

    expect(
      await failure(
        pipeline.run(
          loaded(m),
          server({ variables: { MOTD: "hi; touch pwned" } }),
        ),
      ),
    ).toContain("Variable MOTD");
    expect(fs.existsSync(serverFile("pwned"))).toBe(false);
  });

  test("resolver vars reach the steps but never replace variables", async () => {
    downloadVars = { LOADER_VERSION: "21.1.77", MOTD: "from resolver" };
    const m = manifest({
      versions: { kind: "static", versions: [] },
      variables: [
        { key: "GAME_VERSION", type: "string", options: { from: "versions" } },
        { key: "MOTD", type: "string" },
      ],
      install: {
        steps: [
          { type: "download", url: "{{DOWNLOAD_URL}}", dest: "server.jar" },
          exec('printf "%s %s" "{{LOADER_VERSION}}" "{{MOTD}}" > out.txt'),
        ],
      },
    });

    await pipeline.run(
      loaded(m),
      server({ variables: { GAME_VERSION: "1.21.1", MOTD: "mine" } }),
    );

    expect(fs.readFileSync(serverFile("out.txt"), "utf8")).toBe("21.1.77 mine");
  });

  test("an empty variable takes the resolved value and is returned to save", async () => {
    downloadVars = { LOADER: "0.29.2", LOADER_VERSION: "0.29.2", MOTD: "x" };
    const m = manifest({
      versions: { kind: "static", versions: [] },
      variables: [
        { key: "GAME_VERSION", type: "string", options: { from: "versions" } },
        { key: "LOADER_VERSION", type: "string", default: "" },
        { key: "MOTD", type: "string" },
      ],
      install: {
        steps: [
          { type: "download", url: "{{DOWNLOAD_URL}}", dest: "server.jar" },
          exec('printf "%s" "{{LOADER_VERSION}}" > out.txt'),
        ],
      },
    });

    const resolved = await pipeline.run(
      loaded(m),
      server({
        variables: { GAME_VERSION: "1.21.1", LOADER_VERSION: "", MOTD: "mine" },
      }),
    );

    expect(resolved).toEqual({ LOADER_VERSION: "0.29.2" });
    expect(fs.readFileSync(serverFile("out.txt"), "utf8")).toBe("0.29.2");
  });
});

describe("InstallPipeline steamcmd", () => {
  test("installs the app into the server folder with substitutions", async () => {
    const m = manifest({
      variables: [{ key: "BRANCH", type: "string", default: "public" }],
      install: {
        steps: [
          {
            type: "steamcmd",
            appId: "896660",
            beta: "{{BRANCH}}",
            validate: false,
          },
        ],
      },
    });

    await pipeline.run(
      loaded(m),
      server({ variables: { BRANCH: "public-test" } }),
      taskId,
    );

    expect(steamApps).toEqual([
      {
        step: {
          appId: "896660",
          beta: "public-test",
          betaPassword: undefined,
          platform: undefined,
          validate: false,
        },
        dir: fs.realpathSync(serverFile()),
      },
    ]);
    expect(stepsSeen()).toContain(TaskSteps.DOWNLOADING_GAME);
    expect(updates.some((u) => u.progress === 42)).toBe(true);
  });
});
