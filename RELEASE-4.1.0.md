### 🇬🇧 ENG:

The database updates by itself on first launch. A copy of the old one is saved next to it as `db.sql.bak-*`.

Permissions now work as roles and access levels. Old permissions are converted automatically, check your accounts in Settings after the update. FTP has no shared login anymore, every user sets their own FTP password.

New
- Reworked interface - cleaner and more compact layout in the sidebar, dashboard, console, files, server settings, backups, scheduler, plugins and mods, Java, extensions, audit log, monitoring and settings
- New themes Mono, Nether and Cherry (instead of Amethyst, Cosmic Night and Aurora) and a page width switch
- AI assistant (BETA) - reads the console, logs and configs, explains errors and can manage servers. Anything that changes a server asks you first. Works with Ollama, LM Studio, OpenRouter, Groq and other OpenAI compatible services
- Velocity networks (BETA) - an easier way to join your servers into a Velocity network
- Roles and access levels - every area (console, files, backups, accounts and so on) has view, change or manage levels, ready-made roles Viewer, Moderator, Operator and Server admin, your own roles, a hint next to dangerous rights
- Players page - who is online, whitelist, operators and bans, kick and op
- Modpacks - install from Modrinth or from a .mrpack file
- Backups - S3 storages, keep rules with a preview, backup history, checksum check on download, warning when a storage is down
- Notifications - inbox in the panel with popups, choose what goes to the panel and what goes to Telegram
- FTP passwords per account - every user gets their own FTP password, the shared FTP login is removed
- Telegram bot - more detailed messages with server addresses, users get notifications only for servers they have access to

Improvements & fixes
- New database structure with step by step upgrades
- Server list shows CPU and RAM of every server and a separate "crashed" status. Auto restart now brings a crashed server back up
- Audit log shows which server was touched and what exactly changed, logs more actions. By default it keeps 180 days and up to 1000 entries, you can change that
- Docker - the panel picks up its running containers after a restart instead of deleting them, itzg containers now run as the right user, health check
- Plugins and mods catalog loads more as you scroll, installed list opens faster
- Java versions in a table with LTS hints and supported game versions
- Network creation and modpack download show progress by step
- Lots of fixes for phones
- Security - limits on login, 2FA and Telegram code attempts; account managers can't give themselves more rights or edit admins, and a manager limited to some servers can't touch accounts and roles outside them
- A crashing extension no longer takes the whole panel down
- install.sh - checks the download, can update an existing install, sets up a systemd service, `--version` picks the version. On update it gives servers time to save before restarting the container, rebuilds the image and fixes file owners for the service
- Anonymous stats are more detailed (which features are used, interface language and theme) and never include server names, players, logins or file contents, see the license agreement. They can be turned off in settings or with KUBEK_TELEMETRY=off
- Builds for Linux arm64 and for older x64 CPUs, SHA256SUMS next to the files
- Updated dependencies

### 🇷🇺 RUS:

База данных обновится сама при первом запуске. Копия старой сохранится рядом как `db.sql.bak-*`.

Права теперь устроены как роли и уровни доступа. Старые права переносятся автоматически, после обновления проверьте аккаунты в настройках. Общего логина FTP больше нет, каждый пользователь задаёт свой FTP-пароль.

Новое
- Доработан интерфейс - элементы расположены аккуратнее и компактнее: боковая панель, дашборд, консоль, файлы, настройки сервера, бэкапы, планировщик, плагины и моды, Java, расширения, журнал аудита, мониторинг и настройки
- Новые темы Mono, Nether и Cherry (вместо Amethyst, Cosmic Night и Aurora) и переключатель ширины страницы
- ИИ-ассистент (BETA) - сам смотрит консоль, логи и конфиги, объясняет ошибки и умеет управлять серверами. Всё, что меняет сервер, сначала спрашивает у вас. Работает с Ollama, LM Studio, OpenRouter, Groq и другими OpenAI-совместимыми сервисами
- Сети Velocity (BETA) - помогает удобнее объединять серверы в сеть Velocity
- Роли и уровни доступа - в каждом разделе (консоль, файлы, бэкапы, аккаунты и т.д.) есть уровни просмотр, изменение и управление, готовые роли Viewer, Moderator, Operator и Server admin, свои роли, подсказки у опасных прав
- Страница игроков - кто онлайн, вайтлист, операторы и баны, кик и op
- Модпаки - установка из Modrinth или из файла .mrpack
- Бэкапы - хранилища S3, правила хранения с предпросмотром, история бэкапов, проверка файла при скачивании, предупреждение, если хранилище недоступно
- Уведомления - входящие в панели со всплывающими окнами, можно выбрать, что приходит в панель, а что в Telegram
- Свой FTP-пароль у каждого аккаунта - общий логин FTP убран
- Telegram-бот - сообщения подробнее и с адресами серверов, уведомления приходят только по серверам, к которым есть доступ

Улучшения и исправления
- Новая структура базы данных и пошаговые обновления
- В списке серверов видно CPU и RAM каждого сервера и отдельный статус "упал". Автоперезапуск теперь поднимает упавший сервер
- В журнале аудита видно, какой сервер затронут и что именно поменялось, записывается больше действий. По умолчанию хранится 180 дней и до 1000 записей, это можно изменить
- Docker - после перезапуска панель подхватывает свои запущенные контейнеры, а не удаляет их, контейнеры itzg запускаются от нужного пользователя, добавлен health check
- Каталог плагинов и модов подгружается при прокрутке, список установленного открывается быстрее
- Версии Java в таблице с пометками LTS и поддерживаемыми версиями игры
- Создание сети и загрузка модпака показывают прогресс по шагам
- Много исправлений для телефонов
- Безопасность - ограничены попытки входа, 2FA и кодов Telegram; менеджеры аккаунтов не могут выдать себе больше прав или менять админов, а менеджер с доступом к части серверов не трогает аккаунты и роли за их пределами
- Упавшее расширение больше не роняет всю панель
- install.sh - проверяет скачанный файл, умеет обновлять установленную панель, ставит сервис systemd, `--version` выбирает версию. При обновлении даёт серверам время сохраниться перед перезапуском контейнера, пересобирает образ и фиксит владельца файлов для сервиса
- Анонимная статистика стала подробнее (какие функции используются, язык и тема интерфейса) и никогда не содержит названий серверов, игроков, логинов и содержимого файлов, подробности в лицензионном соглашении. Отключается в настройках или через KUBEK_TELEMETRY=off
- Сборки для Linux arm64 и для старых x64 процессоров, SHA256SUMS рядом с файлами
- Обновлены зависимости

**Full Changelog**: https://github.com/Seeroy/kubek-minecraft-dashboard/compare/v4.0.2...v4.1.0
