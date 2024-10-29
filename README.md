[Readme на русском](README_RU.md)

# What is this project?
Kubek is a Minecraft web server control panel that supports Linux and Windows. The project offers an intuitive interface for managing servers, plugins and mods and more. Includes an integrated FTP server and file manager with syntax highlighting. Users can control access to servers through a user and role system

[![CI/CD status](https://github.com/Seeroy/kubek-minecraft-dashboard/actions/workflows/build.yml/badge.svg)](https://github.com/Seeroy/kubek-minecraft-dashboard/actions/workflows/build.yml)

**Features:**
- **Linux and Windows supported**
- **Intuitive Single-Page UI:** A clean and straightforward user interface for easy navigation and usage
- **Plugins and Mods Management:** Manage plugins and mods for your Minecraft server
- **Server Properties Editor:** Easily edit server.properties file to customize server settings
- **FTP Server:** Integrated FTP server for convenient file transfer
- **File Manager:** File manager with syntax highlighting for managing server files
- **Users and Roles System:** Manage users and roles with access restrictions to servers

**Natively supported cores:**
- Official Vanilla Server
- PaperMC
- Spigot
- Waterfall
- Velocity
- Purpur
- Magma

# Installation

## Download prepared release (recommended)

Download and run the file suitable for your OS [from latest release](https://github.com/Seeroy/kubek-minecraft-dashboard/releases/latest)

## Build from sources

Clone repository and install libs
**Node.js >= 20 required!**
```
git clone https://github.com/Seeroy/kubek-minecraft-dashboard.git
cd kubek-minecraft-dashboard
npm install
```

Start after installation
```
npm start
```

## Use Docker container

Replace YOURPORT with the desired port for web interface and YOURDIRECTORY with the path to the host directory where your servers are located

```
docker run -d -p YOURPORT:3000 -v YOURDIRECTORY:/usr/kubek/servers --name kubik ghcr.io/rxflex/kubek-minecraft-dashboard:latest
```