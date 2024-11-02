[English Readme](README.md)

# Что это за проект?
Kubek — это панель управления веб-сервером Minecraft, поддерживающая Linux и Windows. Проект предлагает интуитивно понятный интерфейс для управления серверами, плагинами и модами и многим другим. Включает встроенный FTP-сервер и файловый менеджер с подсветкой синтаксиса. Пользователи могут контролировать доступ к серверам через систему пользователей и ролей.

[![Статус CI/CD](https://github.com/Seeroy/kubek-minecraft-dashboard/actions/workflows/build.yml/badge.svg)](https://github.com/Seeroy/kubek-minecraft-dashboard/actions/workflows/build.yml)

**Функции:**
- **Поддержка Linux/Windows**
- **Интуитивно понятный пользовательский интерфейс:** Чистый и понятный пользовательский интерфейс для удобной навигации и использования
- **Управление плагинами/модами:** Управляйте плагинами и модами для вашего сервера Minecraft
- **Редактор server.properties:** Легко редактируйте файл server.properties, чтобы настроить параметры сервера
- **Встроенный FTP-сервер** для удобной передачи файлов
- **Файловый менеджер** с подсветкой синтаксиса для управления файлами сервера
- **Система прав и пользователей:** Управляйте пользователями и ролями с ограничениями доступа к серверам

**Официально поддерживаемые ядра:**
- Vanilla
- PaperMC
- Spigot
- Waterfall
- Velocity
- Purpur
- Magma

# Установка

## Скачать готовый релиз (рекомендуется)

Скачайте и запустите подходящий под вашу ОС файл [из последнего релиза](https://github.com/Seeroy/kubek-minecraft-dashboard/releases/latest)

## Собрать из исходников

Клонируйте репозиторий и установите библиотеки
**Node.js >= 20 required!**
```
git clone https://github.com/Seeroy/kubek-minecraft-dashboard.git
cd kubek-minecraft-dashboard
npm install
```

Запустите
```
npm start
```

## Использовать контейнер Docker

Если вы знаете все порты, которые вам нужно использовать, вы можете запустить Kubek в Docker с помощью команды ниже. В данном примере для самой панели используется порт 3000, а для сервера — 25565
Замените YOUR_DIRECTORY на путь к вашей папке

```
docker run -d --name kubek \
            --restart unless-stopped \
			-p 3000:3000 \
			-p 25565:25565 \
			-v /YOUR_DIRECTORY/servers:/usr/kubek/servers \
			-v /YOUR_DIRECTORY/logs:/usr/kubek/logs \
			-v /YOUR_DIRECTORY/binaries:/usr/kubek/binaries \
			-v /YOUR_DIRECTORY/config.json:/usr/kubek/config.json \
			seeroy/kubek-minecraft-dashboard
```

Если вы хотите открыть все порты, то используйте команду ниже (с ней панель всегда будет работать на порту 3000, переназначение портов недоступно)
```
docker run -d --name kubek --network host \
            --restart unless-stopped \
			-v /YOUR_DIRECTORY/servers:/usr/kubek/servers \
			-v /YOUR_DIRECTORY/logs:/usr/kubek/logs \
			-v /YOUR_DIRECTORY/binaries:/usr/kubek/binaries \
			-v /YOUR_DIRECTORY/config.json:/usr/kubek/config.json \
			seeroy/kubek-minecraft-dashboard
```