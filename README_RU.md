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

Замените YOURPORT на желаемый порт для веб-интерфейса и YOURDIRECTORY на путь к каталогу хоста, где расположены ваши серверы

```
docker run -d -p YOURPORT:3000 -v YOURDIRECTORY:/usr/kubek/servers --name kubek seeroy/kubek-minecraft-dashboard:latest
```