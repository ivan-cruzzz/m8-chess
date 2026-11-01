<!-- autopilot:start -->
# M8 (chess-duolingo) — шахматный тренажёр в стиле Duolingo: память для агента, впервые открывшего репозиторий

## Команды (проверены на этом репозитории)

| Команда | Что делает |
|---|---|
| `npm install` | установка зависимостей (541 пакет) |
| `npm run dev` | дев-сервер на http://localhost:5173 |
| `npm run check` | oxlint + tsc + vitest одной командой (89 тестов, 13 файлов) |
| `npx vitest run src/game/__tests__/mateGen.test.ts` | один файл тестов (путь подставь свой) |
| `npm run build` | прод-сборка + PWA service worker |
| `npm run tauri:build` / `npx cap sync` | сборка .exe / синк .apk — не проверялись в этом прогоне |

## Где что

- `src/App.tsx` — роутинг экранов через state `Screen` (`map`, `lesson`, `puzzle`, `play`, `daily`, `practice`, `review`, `profile`, `settings`, `premium`, `admin`, `stats`, `openings`); новый экран = значение в union + ветка рендера здесь.
- `src/admin/` — админ-панель: `auth.ts` (пароль PBKDF2 + сессия), `store.ts` (все данные панели, без React); UI — `src/components/admin/` (`AdminGate`, `AdminPanel` + вкладки).
- `src/hooks/useProgress.ts` — весь прогресс игрока (мутации, миссии, лиги); экспортированный `normalize()` — единая точка миграции старых сохранений.
- `src/data/` — контент курса: `lessons.ts` (внутри `defaultProgress`), `puzzles.ts`, `theory.ts`, `course.ts`, `openings.ts`.
- `src/contexts/I18nContext.tsx` — оба словаря (`ru`, `en`) и `t()` в одном файле; Auth/Subscription/Theme контексты рядом в `src/contexts/`.
- `src/ai/` — шахматный движок (`engine/`, Web Worker), LLM-коуч (`coach/`), RPC-клиент `client/engineClient.ts`.
- `docs/architecture.md` — слои, data flow, границы модулей, конвенции: сначала читай туда.

## Подводные камни

- i18n-ключ обязан существовать в ОБОИХ словарях `ru` и `en` в `src/contexts/I18nContext.tsx` — пропустишь один, `t()` молча вернёт сам ключ, и он утечёт в UI.
- localStorage-ключи `chessup-*` (`chessup-progress:<userId>`, `chessup-plan:<userId>`, `chessup-users`, `chessup-promos`, `chessup-lang`, `chessup-theme`, `chessup-session`, `chessup-admin-hash`, `chessup-admin-session`) не переименовывать — там данные игроков.
- Новое поле в `UserProgress` требует backfill в двух местах сразу: `normalize()` в `src/hooks/useProgress.ts` И `defaultProgress` в `src/data/lessons.ts` — без этого старые сохранения падают.
- `src/admin/store.ts` без React-зависимостей сознательно — чистый модуль над localStorage/Supabase, тестируется без UI; не тащи туда хуки.
- Дев-сервер Vite по умолчанию слушает `[::1]`; на машинах с блокировкой IPv6-loopback запускай `npx vite --host 127.0.0.1`.
- Тесты идут в happy-dom без Web Worker — `src/ai/client/engineClient.ts` имеет синхронный fallback; новый код не должен требовать Worker в тестах.
- Эмодзи в `src/data/theory.ts` и `src/data/course.ts` — учебный контент, а не мусор: не «чистить».

## Окружение

- `.env` не в git (шаблон — `.env.example`): `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` включают Supabase; без них (или с `VITE_LOCAL_ADMIN=1`) приложение работает в локальном офлайн-режиме.
- `ADMIN_PASSWORD` — env-переменная только для диагностических скриптов `scripts/` (например, `scripts/check-admin-login.mjs`); в `.env` и в коде приложения её нет.

## Как здесь работает Autopilot

Сборка ведётся навыком `/autopilot`. Требования, спецификация и таски — в `.autopilot/`.
Прогресс — `.autopilot/dashboard.html`. Требование из `manifest.md` может снять
только пользователь. Прерванную сборку продолжает «продолжи автопилот».

### Правка без автопилота

Мелкий баг или доводка после сборки — обычная сессия, без прогона.

Сначала прочитай:
1. `.autopilot/PROGRESS.md` — что не доделано, известные баги, о чём договорились с пользователем.
2. Что правили после последней сборки — первая строка таблицы в «История git».
3. Только если правка их касается: почему сделано так — `docs/adr/`; что значат слова — `CONTEXT.md`;
   что именно просили — `manifest.md` в папке сборки (указана в начале `PROGRESS.md`).

После правки:
- коммит — по правилам из «История git»;
- строка в «Правки без автопилота» в `PROGRESS.md`: дата — что — почему;
- починенный пункт из «Не доделано» или «Известные баги» — удали;
- договорились с пользователем о том, что следующая сборка не должна пересматривать, —
  строка в «Договорились», его словами.

### История git

Целиком не читай — бери срез под вопрос:

| Вопрос | Команда |
|---|---|
| что правили после последней сборки | `git log --oneline "$(git log -1 --format=%h --grep='^Autopilot: сборка сдана')"..HEAD -- . ':(exclude).autopilot'` |
| всё, что делали ради требования | `git log --oneline --grep="R02"` |
| история файла | `git log --oneline -10 -- <файл>` |
| когда появился или исчез код | `git log --oneline -S "<фрагмент>"` |
| почему строка такая | `git blame -L <с>,<по> <файл>`, затем `git show <sha>` |
| что внутри коммита | `git show --stat <sha>` |

Срез длиннее ~30 коммитов — отдай его субагенту и возьми выжимку в десять строк.

Коммит: заголовок — что (`fix: даты в одном формате`), тело — почему, трейлер
`--trailer "Requirements: R02"`, если правка касается требования из `manifest.md`.
Заголовок `Autopilot: сборка сдана` пишет только автопилот — по нему находят последнюю сборку.
<!-- autopilot:end -->
