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
import type { IBuildTarget } from "./build.types.ts";

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
  { platform: "bun-darwin-arm64", suffix: "darwin-arm64", outputName: "main" },
];

interface BuildOptions {
  skipFrontend: boolean;
  skipBackend: boolean;
  platform?: string;
  help: boolean;
}

function parseArgs(): BuildOptions {
  const args = process.argv.slice(2);
  const options: BuildOptions = {
    skipFrontend: false,
    skipBackend: false,
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
  bun run build.ts [options]

Options:
  -h, --help                    Show this help message
  -f, --skip-frontend           Skip frontend build (use existing build)
  -b, --skip-backend            Skip backend build (use existing build)
  -p, --platform <platform>     Build for specific platform only

Available platforms:
  - win         Windows x64
  - linux       Linux x64
  - mac         macOS ARM64
  - native      Host platform/arch (used by Docker for multi-arch builds)
  - all         All platforms (default)

Examples:
  bun run build.ts                          # Build everything for all platforms
  bun run build.ts --skip-frontend          # Skip frontend, build backend and all platforms
  bun run build.ts --platform win           # Build only Windows binary
  bun run build.ts -f -b --platform linux   # Skip builds, only compile Linux binary
  bun run build.ts --help                   # Show this help
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

  const platformMap: { [key: string]: IBuildTarget } = {
    win: targets.find((t) => t.suffix.includes("win"))!,
    linux: targets.find((t) => t.suffix.includes("linux"))!,
    mac: targets.find((t) => t.suffix.includes("darwin"))!,
  };

  const target = platformMap[platformArg];
  if (!target) {
    throw new Error(
      `Unknown platform: ${platformArg}. Available: win, linux, mac, all`,
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
  console.log(`   Platform: ${options.platform || "all"}`);
  console.log(`   Version: ${version}`);
  console.log("");

  const selectedTargets = getTargets(options.platform);

  // 2️⃣ Build frontend (Next.js) if not skipped
  if (!options.skipFrontend) {
    log("Building frontend (Next.js)...");
    run("bun run build", frontendDir);

    log("Creating VFS from frontend output...");
    const bundleDir = path.join(frontendDir, "bundle");
    if (existsSync(bundleDir)) rmSync(bundleDir, { recursive: true });
    mkdirSync(bundleDir, { recursive: true });

    const vfsPath = "./../shared/vfs.js";
    const outDir = path.join(frontendDir, "out");
    generateVfsFromDirectory(outDir, path.join(frontendDir, vfsPath));
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

    await Bun.build({
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
      },
      target: "bun",
      compile: t.native ? true : t.platform,
      sourcemap: "none",
    });

    // Rename the compiled binary
    const builtFile = path.join(outputDir, t.outputName);
    if (existsSync(builtFile)) {
      rmSync(outFile, { force: true });
      cpSync(builtFile, outFile);
      rmSync(builtFile, { force: true });
      console.log(`✅ Binary built: ${outFile}`);
    } else {
      console.warn(`⚠️ Binary not found after build: ${builtFile}`);
    }
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

function run(cmd: string, cwd?: string) {
  console.log(`> ${cmd}`);
  execSync(cmd, { cwd, stdio: "inherit" });
}

function generateVfsFromDirectory(sourceDir: string, outFile: string) {
  const files = listFilesRecursively(sourceDir);
  const rows = files.map((absolutePath) => {
    const relativePath = path.relative(sourceDir, absolutePath).split(path.sep).join("/");
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
