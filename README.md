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

If you know all the ports you need to use, you can run Kubek in Docker using a command like this. In this example, port 3000 is used for the panel itself, and 25565 for the server
Replace YOUR_DIRECTORY with your folder path

```
docker run -d --name kubek \
			-p 3000:3000 \
			-p 25565:25565 \
			-v /YOUR_DIRECTORY/servers:/usr/kubek/servers \
			-v /YOUR_DIRECTORY/logs:/usr/kubek/logs \
			-v /YOUR_DIRECTORY/binaries:/usr/kubek/binaries \
			-v /YOUR_DIRECTORY/config.json:/usr/kubek/config.json \
			seeroy/kubek-minecraft-dashboard
```

If you want to open all ports, then use the command below (with it, Kubek will always work on port 3000, port remapping is not available)
```
docker run -d --name kubek --network host \
			-v /YOUR_DIRECTORY/servers:/usr/kubek/servers \
			-v /YOUR_DIRECTORY/logs:/usr/kubek/logs \
			-v /YOUR_DIRECTORY/binaries:/usr/kubek/binaries \
			-v /YOUR_DIRECTORY/config.json:/usr/kubek/config.json \
			seeroy/kubek-minecraft-dashboard
```