import { execSync } from "child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "fs";
import path from "path";
import { asciiCommentsPlugin } from "./ascii-comments.ts";
import type { IBuildTarget } from "./build.types.ts";
import { writeChecksums } from "./checksums.ts";

// Directories
const rootDir = path.resolve(__dirname, "..");
const frontendDir = path.join(rootDir, "frontend");
const backendDir = path.join(rootDir, "backend");
const sharedDir = path.join(rootDir, "shared");
const outputDir = path.join(rootDir, "dist");

// Build targets
const targets: IBuildTarget[] = [
  {
    platform: "bun-windows-x64",
    suffix: "win-x64.exe",
    outputName: "main.exe",
  },
  { platform: "bun-linux-x64", suffix: "linux-x64", outputName: "main" },
  // Old CPUs without AVX2, common on cheap VPS
  {
    platform: "bun-linux-x64-baseline",
    suffix: "linux-x64-baseline",
    outputName: "main",
  },
  { platform: "bun-linux-arm64", suffix: "linux-arm64", outputName: "main" },
  { platform: "bun-darwin-arm64", suffix: "darwin-arm64", outputName: "main" },
];

interface BuildOptions {
  skipFrontend: boolean;
  skipBackend: boolean;
  skipTests: boolean;
  platform?: string;
  help: boolean;
}

function parseArgs(): BuildOptions {
  const args = process.argv.slice(2);
  const options: BuildOptions = {
    skipFrontend: false,
    skipBackend: false,
    skipTests: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    switch (arg) {
      case "--skip-frontend":
      case "-f":
        options.skipFrontend = true;
        break;
      case "--skip-backend":
      case "-b":
        options.skipBackend = true;
        break;
      case "--skip-tests":
      case "-t":
        options.skipTests = true;
        break;
      case "--platform":
      case "-p":
        if (i + 1 < args.length) {
          options.platform = args[++i];
        } else {
          throw new Error("--platform requires a value");
        }
        break;
      case "--help":
      case "-h":
        options.help = true;
        break;
      default:
        if (arg?.startsWith("-")) {
          console.warn(`⚠️ Unknown option: ${arg}`);
        }
        break;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
Build Script for Kubek

Usage:
  bun run build [options]

Options:
  -h, --help                    Show this help message
  -f, --skip-frontend           Skip frontend build (use existing build)
  -b, --skip-backend            Skip backend build (use existing build)
  -t, --skip-tests              Skip typecheck and unit tests before the build
  -p, --platform <platform>     Build for specific platform only

Available platforms:
  - win                 Windows x64
  - linux, linux-x64    Linux x64
  - linux-x64-baseline  Linux x64 for CPUs without AVX2
  - linux-arm64         Linux ARM64
  - mac                 macOS ARM64
  - native              Host platform/arch (used by Docker for multi-arch builds)
  - all                 All platforms (default)

Examples:
  bun run build                          # Build everything for all platforms
  bun run build --skip-frontend          # Skip frontend, build backend and all platforms
  bun run build --platform win           # Build only Windows binary
  bun run build -f -b --platform linux   # Skip builds, only compile Linux binary
  bun run build --help                   # Show this help

Release binaries get a SHA256SUMS file next to them in dist/
`);
}

function getTargets(platformArg?: string): IBuildTarget[] {
  if (!platformArg || platformArg === "all") {
    return targets;
  }

  // Host platform/arch, used by Docker for multi-arch images
  if (platformArg === "native") {
    const isWindows = process.platform === "win32";
    return [
      {
        // overridden by native:true below
        platform: "bun-linux-x64",
        suffix: "native",
        outputName: isWindows ? "main.exe" : "main",
        native: true,
      },
    ];
  }

  const bySuffix = (suffix: string) => targets.find((t) => t.suffix === suffix);
  const platformMap: { [key: string]: IBuildTarget | undefined } = {
    win: bySuffix("win-x64.exe"),
    linux: bySuffix("linux-x64"),
    "linux-x64": bySuffix("linux-x64"),
    "linux-x64-baseline": bySuffix("linux-x64-baseline"),
    "linux-arm64": bySuffix("linux-arm64"),
    mac: bySuffix("darwin-arm64"),
  };

  const target = platformMap[platformArg];
  if (!target) {
    throw new Error(
      `Unknown platform: ${platformArg}. Available: ${Object.keys(platformMap).join(", ")}, native, all`,
    );
  }

  return [target];
}

async function main() {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  // 1️⃣ Read version from package.json
  const pkg = JSON.parse(
    readFileSync(path.join(rootDir, "package.json"), "utf-8"),
  );
  const version = pkg.version ?? "0.0.0";

  // Show build configuration
  console.log("🔧 Build Configuration:");
  console.log(`   Skip Frontend: ${options.skipFrontend}`);
  console.log(`   Skip Backend: ${options.skipBackend}`);
  console.log(`   Skip Tests: ${options.skipTests}`);
  console.log(`   Platform: ${options.platform || "all"}`);
  console.log(`   Version: ${version}`);
  console.log("");

  const selectedTargets = getTargets(options.platform);

  // Unit tests only, the e2e suites need a running backend and real game servers
  if (!options.skipTests) {
    log("Running typecheck and tests...");
    run("bun run typecheck", backendDir);
    run("bun run test", backendDir);
    run("bun test ./scripts", rootDir);
  } else {
    log("Skipping tests");
  }

  // 2️⃣ Build frontend (Next.js) if not skipped
  if (!options.skipFrontend) {
    log("Building frontend (Next.js)...");
    // Force the same-origin API/WS fallback into the bundle
    run("bun run build", frontendDir, {
      NEXT_PUBLIC_API_URL: "",
      NEXT_PUBLIC_WS_URL: "",
    });

    log("Creating VFS from frontend output...");
    const outDir = path.join(frontendDir, "out");
    generateVfsFromDirectory(outDir, path.join(sharedDir, "vfs.js"));
  } else {
    log("Skipping frontend build");
  }

  // 3️⃣ Build backend (Nest.js) if not skipped
  if (!options.skipBackend) {
    log("Building backend (bun build)...");
    run("bun run build", backendDir);
  } else {
    log("Skipping backend build");
  }

  // Copy vfs to backend dist (needed for both backend build and binary compilation)
  if (existsSync(path.join(sharedDir, "vfs.js"))) {
    cpSync(
      path.join(sharedDir, "vfs.js"),
      path.join(backendDir, "dist", "shared", "vfs.js"),
      { force: true },
    );
  }

  // Check if the generated VFS file exists
  const vfsFile = path.join(sharedDir, "vfs.js");
  if (!existsSync(vfsFile)) {
    throw new Error(
      "❌ Missing VFS file. Frontend build may have failed or VFS was not generated.",
    );
  }

  // 4️⃣ Prepare files for bundling into the binary
  log("Collecting files for the bundle...");

  const entry = path.join(backendDir, "dist/backend/src/main");

  // Verify backend was built if we didn't skip it
  if (!options.skipBackend && !existsSync(entry + ".js")) {
    throw new Error(
      `❌ Backend entry point not found: ${entry}.js. Backend build may have failed.`,
    );
  }

  // Include VFS as part of the build entrypoints
  const allEntries = [entry, vfsFile];

  // 5️⃣ Build binaries for selected platforms
  log(`Compiling binaries for ${selectedTargets.length} platform(s)...`);

  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  for (const t of selectedTargets) {
    log(`Building for: ${t.platform}...`);
    const outFile = path.join(outputDir, `Kubek-${version}-${t.suffix}`);

    const isWindowsTarget = t.platform.includes("windows");

    const result = await Bun.build({
      // Get errors in result.logs instead of an AggregateError
      throw: false,
      entrypoints: allEntries,
      outdir: outputDir,
      external: [
        "@nestjs/microservices/microservices-module",
        "@nestjs/microservices",
        "class-transformer/storage",
      ],
      // Embed the version at compile time — the binary has no package.json on disk.
      define: {
        "process.env.KUBEK_VERSION": JSON.stringify(version),
        // Bun inlines "development" by default
        "process.env.NODE_ENV": JSON.stringify("production"),
      },
      target: "bun",
      sourcemap: "none",
      plugins: [asciiCommentsPlugin],
      compile: t.native
        ? true
        : {
            target: t.platform,
            ...(isWindowsTarget
              ? {
                  windows: {
                    icon: path.join(frontendDir, "public", "favicon.ico"),
                    title: "Kubek",
                    publisher: "Seeroy",
                    version,
                  },
                }
              : {}),
          },
    });

    if (!result.success) {
      for (const message of result.logs) console.error(message);
      throw new Error(`❌ Compilation failed for ${t.platform}`);
    }
    for (const message of result.logs) console.warn(message);

    // Rename the compiled binary
    const builtFile = path.join(outputDir, t.outputName);
    if (!existsSync(builtFile)) {
      throw new Error(`❌ Binary not found after build: ${builtFile}`);
    }
    rmSync(outFile, { force: true });
    cpSync(builtFile, outFile);
    rmSync(builtFile, { force: true });
    console.log(`✅ Binary built: ${outFile}`);
  }

  if (selectedTargets.some((t) => !t.native)) {
    const sums = writeChecksums(outputDir, version);
    console.log(`✅ Checksums written: ${sums}`);
  }

  log("✅ All builds completed successfully!");
}

// Handle uncaught errors
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Only run main if this script is executed directly
if (import.meta.main) {
  main().catch((err) => {
    console.error("❌ Build error:", err);
    process.exit(1);
  });
}

//
// UTILS
//
function log(msg: string) {
  console.log(`\n🔹 ${msg}`);
}

function run(cmd: string, cwd?: string, env?: Record<string, string>) {
  console.log(`> ${cmd}`);
  execSync(cmd, {
    cwd,
    stdio: "inherit",
    env: env ? { ...process.env, ...env } : process.env,
  });
}

function generateVfsFromDirectory(sourceDir: string, outFile: string) {
  const files = listFilesRecursively(sourceDir);
  const rows = files.map((absolutePath) => {
    const relativePath = path
      .relative(sourceDir, absolutePath)
      .split(path.sep)
      .join("/");
    const encoded = readFileSync(absolutePath).toString("base64");
    return `  ${JSON.stringify(relativePath)}: ${JSON.stringify(encoded)},`;
  });

  const output = `export default {\n${rows.join("\n")}\n};\n`;
  writeFileSync(outFile, output, "utf-8");
}

function listFilesRecursively(dir: string): string[] {
  const dirEntries = readdirSync(dir, { withFileTypes: true });
  const result: string[] = [];

  for (const entry of dirEntries) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...listFilesRecursively(entryPath));
      continue;
    }
    if (entry.isFile()) {
      result.push(entryPath);
    }
  }

  return result;
}
