# Scheduler guide

**ENG:**
Kubek has the ability to schedule a server restart at a specific time using the cron syntax.

![изображение](https://user-images.githubusercontent.com/37861929/228534877-559e757f-1278-4a41-8232-36c467733934.png)

Examples:
*/30 * * * * - restart server every 30 minutes
0 5 * * * - restart server at 5:00
0 0 * * * - restart server every day at 00:00
0 22 * * 7 - restart server every sunday

**RUS:**
В Kubek существует возможность планировать перезагрузку сервера на определённое время с помощью синтаксиса cron.

![изображение](https://user-images.githubusercontent.com/37861929/228534945-ee71c481-fb31-42bc-9dc6-f9ff170d57d2.png)

Примеры:
*/30 * * * * - перезапускать сервер каждые 30 минут
0 5 * * * - перезапустить сервер, at 5:00
0 0 * * * - перезапускать сервер каждый день в 00:00
0 22 * * 7 - перезапускать сервер каждый день
