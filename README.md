<div align="center">

<img src="header.png" alt="Kubek" width="75%" style="border-radius: 8px;" />

**A self-hosted control panel for Minecraft servers.**

Run all of your servers from one web UI: create them, tweak their configs, watch them, install plugins and mods, manage files and backups, and keep an eye on the console

[![Docker Pulls](https://img.shields.io/docker/pulls/seeroy/kubek-minecraft-dashboard?logo=docker&label=pulls)](https://hub.docker.com/r/seeroy/kubek-minecraft-dashboard)
[![Image Size](https://img.shields.io/docker/image-size/seeroy/kubek-minecraft-dashboard/latest?logo=docker&label=image)](https://hub.docker.com/r/seeroy/kubek-minecraft-dashboard)
[![Release](https://img.shields.io/github/v/release/Seeroy/kubek-minecraft-dashboard?logo=github)](https://github.com/Seeroy/kubek-minecraft-dashboard/releases)
[![Stars](https://img.shields.io/github/stars/Seeroy/kubek-minecraft-dashboard?logo=github)](https://github.com/Seeroy/kubek-minecraft-dashboard/stargazers)

**English** · [Русский](README.ru.md)

</div>

---

## ✨ Features

### Servers

- Run as many servers as you like side by side: Vanilla, Paper, Spigot, Purpur, Bukkit, Fabric, Forge, Velocity, or a plain custom jar
- Start, stop, restart and type console commands, with output streamed live over WebSocket
- Duplicate a server, export it to a single file, or import one back. Sort servers into folders, and delete several at once when you're cleaning up
- New servers go through a short setup flow, and the matching Java runtime is downloaded automatically

### Plugins & mods

- Search and install plugins (Bukkit/Spigot/Paper) and Fabric mods directly from Modrinth
- A badge shows up when something is out of date; updating is one click
- Dependencies are pulled in automatically, and there's a dependency tree so you can see what dragged in what

### Monitoring & diagnostics

- Per-server CPU, RAM and player counts in real time + host-level stats (CPU, memory, disks)
- Historical CPU/RAM charts, so you can look back instead of only at the current moment
- Player list with names, avatars and online status, read over the Query protocol
- Log analysis catches the usual suspects — out of memory, port already in use, corrupt world, plugin/mod crashes, the wrong Java version — and the diagnostics panel offers a fix where it can

### Files, console & backups

- File manager with a Monaco editor (the one VS Code uses), drag-and-drop uploads, and archive create/extract
- Live console with command input and smart suggestions + separate viewer for older logs
- Create and restore backups of a single world or the whole server

### Automation

- **Scheduler** — run things on a cron, on a simple interval, or just once at a set time. An action can be start/stop/restart, a console command, a backup, or an outgoing webhook. There's a cron preview and a per-task run history so you can tell what actually fired
- **Telegram bot** — notifications and remote control: OTP login, server controls, and even a create-server wizard

### Access control

- Multiple accounts with per-feature permissions (see [Roles & permissions](#-roles--permissions-rbac) below) and optional per-server access
- Two-factor auth — a TOTP app or a tap-to-approve prompt in Telegram — and a list of your active sessions that you can revoke individually
- An audit log of who did what, searchable and filterable

### Make it yours

- A dashboard you can rearrange: drag-and-drop widgets for your servers, host resources, diagnostics and backups
- A command palette for jumping around from the keyboard
- Server types are described by **blueprints**, and a panel **extension system** can bolt on new features, UI, event handlers and even its own permissions
- Optional built-in FTP server
- Full English and Russian throughout

---

## 🔐 Roles & permissions (RBAC)

Every account is granted exactly the permissions it needs, and nothing more

| Permission          | Key                 | What it unlocks                         |
| ------------------- | ------------------- | --------------------------------------- |
| View servers        | `servers_view`      | See servers and their current state     |
| Control servers     | `servers_control`   | Start / stop / restart, use the console |
| Configure servers   | `servers_configure` | Edit settings and `server.properties`   |
| Create servers      | `servers_create`    | Create, duplicate and import servers    |
| Manage plugins/mods | `plugins_mgr`       | Install and update plugins and mods     |
| File manager        | `file_manager`      | Read and write server files             |
| Manage Java         | `java_mgr`          | Download and remove Java runtimes       |
| Backups             | `backups`           | Create and restore backups              |
| Scheduler           | `scheduler_mgr`     | Create and manage scheduled tasks       |
| System monitoring   | `system_monitoring` | View host CPU / RAM / disk stats        |
| Audit log           | `audit_log`         | Read the audit log                      |
| Accounts            | `accounts_mgr`      | Create and edit other accounts          |
| Panel settings      | `kubek_settings`    | Change panel-wide settings              |

On top of that, a non-admin account can be **restricted to specific servers** — handy when you want to hand someone a single server without showing them the rest

And because permissions are just a registry, **extensions can declare their own**

---

## 🧩 Extensions & blueprints (for developers)

Kubek is built to be extended from the outside, no fork required. **Blueprints** describe server types — how a jar is fetched, configured and launched — and **extensions** bolt on whole features: new pages and UI, API routes, event handlers and their own permissions

Two SDKs with starter templates get you going in minutes:

| SDK                                                                       | npm                                                                                | Starter template                                                          |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **Extension SDK** — add features, UI, API routes, events and permissions  | [`@kubekpanel/extension-sdk`](https://www.npmjs.com/package/@kubekpanel/extension-sdk) | [KubekPanel/extension-template](https://github.com/KubekPanel/extension-template) |
| **Blueprint SDK** — describe new server types (download, config, launch)  | [`@kubekpanel/blueprint-sdk`](https://www.npmjs.com/package/@kubekpanel/blueprint-sdk) | [KubekPanel/blueprint-template](https://github.com/KubekPanel/blueprint-template) |

---

## 🚀 Quick start

### One-line install (Linux / macOS)

```bash
curl -fsSL https://raw.githubusercontent.com/Seeroy/kubek-minecraft-dashboard/main/install.sh | bash
```

It detects your system and either downloads the native binary or sets up Docker. Then open **http://localhost:8000**.

<details>
<summary>Install script options</summary>

```bash
# Force Docker Compose instead of a native binary
curl -fsSL .../install.sh | bash -s -- --docker

# Force the native binary (fails if your platform is unsupported)
curl -fsSL .../install.sh | bash -s -- --binary

# Custom directory / version / install without starting
curl -fsSL .../install.sh | bash -s -- --dir /opt/kubek --version v4.0.0 --no-run
```

</details>

### Docker Compose (builds from source)

```bash
git clone https://github.com/Seeroy/kubek-minecraft-dashboard.git
cd kubek-minecraft-dashboard
docker compose up -d
```

### Docker (prebuilt image)

```bash
docker run -d --name kubek -p 8000:8000 -v kubek-data:/data seeroy/kubek-minecraft-dashboard:latest
```

### Prebuilt binary

Grab the latest binary for your OS from the [releases page](https://github.com/Seeroy/kubek-minecraft-dashboard/releases) and run it:

```bash
chmod +x Kubek-*-linux-x64
./Kubek-*-linux-x64
```

---

## 🔄 Migrating from a previous version (1.x - 3.x)

Coming from old Kubek? Migration is **semi-auto** — Kubek imports your old data on first launch, no separate tool required

1. Put your old install's files in Kubek's working directory (`/data` in Docker):
   - `config.json` — panel settings (language, FTP, Telegram bot, web port…)
   - `users.json` — accounts and their permissions
   - `servers/` — the whole folder, including `servers/servers.json` and each server's files
2. Start Kubek and **watch the console output**

What happens:

- ⚙️ **Settings** are imported into the new database
- 🎮 **Servers** are imported and their folders renamed to the new `servers/<uuid>` layout. The server jar and JVM flags (`-Xmx`/`-Xms`) are detected from the old start scripts automatically
- 👥 **Accounts** are migrated with their permissions, but **new passwords are generated** (old hashes can't be reversed). They are printed to the console once — save them immediately

After a successful import the old files are renamed to `*.migrated-backup` and migration won't run again. If something looks off, stop Kubek, restore those files, and start over

> Tip: make a copy of your old data before migrating :)

---

## ⚙️ Configuration

| Variable   | Default | Description                             |
| ---------- | ------- | --------------------------------------- |
| `PORT`     | `8000`  | Web panel port (HTTP + WebSocket)       |
| `FTP_PORT` | `21`    | Built-in FTP server port (when enabled) |
| `TZ`       | `UTC`   | Container timezone                      |

On first launch a setup wizard creates your admin account and shows password in logs

> Tip: admin password shows only once. If you forgot to remember it - delete database and start from scratch

### Data & persistence

Everything lives in the working directory (`/data` in Docker) — mount it as a volume to keep your data:

| Path             | Contents                        |
| ---------------- | ------------------------------- |
| `db.sql`         | Panel database (config, users…) |
| `servers/`       | All Minecraft server files      |
| `backups/`       | Backup archives                 |
| `binaries/java/` | Auto-downloaded Java runtimes   |

### Ports & Minecraft servers

Each Minecraft server uses its own port (`25565` by default). Publish each one in `docker-compose.yml`, or on Linux use `network_mode: host` to expose them all at once

---

## 🛠️ Build from source

Requires [Bun](https://bun.sh)

```bash
git clone https://github.com/Seeroy/kubek-minecraft-dashboard.git
cd kubek-minecraft-dashboard

bun install
(cd frontend && bun install)
(cd backend && bun install)

bun run build                 # all platforms → dist/
bun run build --platform linux # one platform only
bun run build --platform native # current arch (used by Docker)
```

Or build the Docker image yourself:

```bash
docker build -t kubek .
docker buildx build --platform linux/amd64,linux/arm64 -t kubek .
```

---
