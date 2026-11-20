## What and why / Что и зачем

<!-- What changes and why. Link the issue if there is one: Fixes #123 -->
<!-- Что меняется и зачем. Ссылка на issue, если есть: Fixes #123 -->

## How it was tested / Как проверено

<!-- What you ran or clicked through / Что запускали или прокликали -->

## Screenshots / Скриншоты

<!-- For UI changes / Для изменений в интерфейсе -->

## Checklist / Чеклист

- [ ] Backend: `bun run typecheck` and `bun run test` in `backend/` pass / проходят
- [ ] Frontend: `bun run typecheck` and `bun run lint` in `frontend/` pass / проходят
- [ ] API changed: `openapi.json` regenerated (`bun run openapi:json` in `backend/`) / API менялось: `openapi.json` перегенерирован
- [ ] New UI text is in both `frontend/src/locales/en` and `ru` / Новые тексты интерфейса есть в обеих локалях
- [ ] New language: every file from `locales/en/modules` is translated and the language is added to `locales/index.ts` / Новый язык: переведены все файлы из `locales/en/modules`, язык добавлен в `locales/index.ts`
- [ ] No unrelated changes / Нет лишних изменений
