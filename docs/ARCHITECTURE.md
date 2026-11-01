# Архитектура M8 (ChessUp)

Слои приложения, потоки данных, границы модулей и конвенции кода.
История решений — в `docs/adr/`.

## Обзор слоёв

```
┌────────────────────────────────────────────────────────────┐
│ UI: src/components (экраны), src/App.tsx (навигация)       │
├────────────────────────────────────────────────────────────┤
│ Hooks: src/hooks (useEngine, useCoach, useProgress)        │
├────────────────────────────────────────────────────────────┤
│ AI-слой: src/ai                                            │
│  ├─ engine/  — шахматный движок (pure TS + Web Worker)     │
│  ├─ coach/   — LLM-тренёр (клиент, кэш, промпты)           │
│  └─ client/  — engineClient: RPC над воркером              │
├────────────────────────────────────────────────────────────┤
│ Админ-слой: src/admin (auth, store) + components/admin     │
├────────────────────────────────────────────────────────────┤
│ Сервисы: src/services (cryptoPay), src/lib (supabase,      │
│          pbkdf2)                                           │
├────────────────────────────────────────────────────────────┤
│ Данные: src/data (контент), src/types (контракты)          │
├────────────────────────────────────────────────────────────┤
│ Бэкенд: Supabase (auth, Postgres, edge functions)          │
│  ├─ create-invoice / check-payment → NOWPayments           │
│  └─ ai-coach → OpenAI-совместимый LLM API                  │
└────────────────────────────────────────────────────────────┘
```

Правило зависимостей: стрелки только вниз. `src/ai` и `src/admin` не импортируют
React; UI не знает о Supabase напрямую — только через `src/lib/supabase.ts`,
сервисы и контексты.

## Потоки данных

### Прогресс игрока

```
компоненты (ChessPuzzle, PracticeScreen, PlayScreen, OpeningsTrainer, …)
  → useProgress (мутации: completePuzzle, noteExternalSolved, noteSprintScore,
    noteOpeningDone, recordMistake, addGame, …)
  → normalize() — миграция/дозаполнение + дневной/недельный ресет
  → localStorage `chessup-progress:<userId>` (ключ от AuthContext-пользователя)
```

`normalize()` экспортирован: тот же `src/data/lessons.ts:defaultProgress`
служит и хуку, и админ-панели при чтении чужих прогрессов. Ежедневные миссии
и боты лиги детерминированы датой (mulberry32 по хешу `YYYY-MM-DD` / `-Wnn`),
без хранения генератора. Внутри `useProgress` единая точка `bumpActivity`
ведёт `activityLog` (вызывается из `completePuzzle` и `noteExternalSolved`).

### Ход движка

```
PlayScreen → useEngine → engineClient (синглтон) → Worker → searchBestMove
  → search-result по id → SAN применяется к партии
```

Отмена запроса — по id на клиенте (воркер занят поиском до конца бюджета;
максимум занятости ограничен `timeBudgetMs` уровня из `src/ai/engine/levels.ts`).
Без Worker (старые WebView, тестовое окружение happy-dom) — синхронный fallback
в setTimeout с тем же бюджетом. Совместимость: `src/game/engine.ts` —
deprecated-обёртка над новым движком.

### LLM-коуч

Действия: `hint` (подсказка без раскрытия хода), `explain` (разбор ошибки),
`review` (итоговый разбор партии).

```
UI (CoachTip в ChessPuzzle / ReviewScreen / PlayScreen)
  → useCoach → askCoach
      1) localStorage-кэш (30 дней, ключ PROMPT_VERSION|action|lang|…) — офлайн, бесплатно
      2) Supabase Edge Function ai-coach
           auth → серверный кэш (coach_cache, sha-256 ключ) → квота дня
           (free 5 / premium 50, coach_usage) → OpenAI-совместимый API
           (секреты AI_PROVIDER_KEY/AI_PROVIDER_URL/AI_MODEL) → строгий
           JSON {title, text} → кэш → ответ
```

Ключ кэша одинаков на клиенте и сервере (`coachCacheKey`); попадание в кэш
не расходует квоту. Секреты провайдера никогда не покидают сервер.

### План подписки и промокоды

```
SubscriptionContext.redeemPromo(code)
  → validatePromo (src/admin/store.ts, чистая)
  → сохранение {plan, until} в `chessup-plan:<userId>` + инкремент uses промокода
  → window-событие `chessup-plan-changed` → все слушатели перечитывают план
```

`planFromStored` (экспорт SubscriptionContext) читает и старую строку-план
(`'monthly'`), и объект `{plan, until}`; `until` в прошлом → план `free`.
Админ-панель выдаёт/отбирает план тем же ключом и диспатчит то же событие.
В Supabase-режиме локальная выдача перечитывается при смене пользователя/refresh.

## Границы модулей

- **`src/admin/auth.ts`** — вход в панель. Владеет ключами `chessup-admin-hash`
  (localStorage, формат `saltHex:hashHex`, PBKDF2-SHA-256, 100 000 итераций,
  соль 16 байт) и `chessup-admin-session` (sessionStorage, ISO-срок, TTL 30
  минут). API: `adminPasswordExists`, `setupAdminPassword`, `verifyAdminPassword`,
  `startAdminSession`, `adminSessionActive`, `endAdminSession`. Формат хеша и
  имена ключей — деталь модуля. Хеширование — общий `src/lib/pbkdf2.ts`
  (`hashPassword`, `randomSaltHex`), та же схема, что в AuthContext.
- **`src/admin/store.ts`** — данные панели, сознательно без React: чистые
  функции над localStorage и Supabase, тестируются без UI. Владеет чтением
  чужих прогрессов (`'chessup-progress:' + userId`), промокодами `chessup-promos`,
  планами `'chessup-plan:' + userId`. API: `listLocalUsers`, `readProgressFor`,
  `resetProgressFor`, `deleteLocalUser`, `listSupabaseUsers` (null, когда
  Supabase выключен), `setUserBanned`, `setUserPlan`/`revokeUserPlan`,
  `savePromo`/`listPromos`/`setPromoActive`, `validatePromo` (чистая; вызывающий
  сам инкрементирует `uses`), `aggregateDashboard` (синхронный и локальный;
  Supabase-счётчики вкладка Дашборда складывает отдельно). Имена ключей и шейпы
  хранения — деталь модуля.
- **`src/hooks/useProgress.ts`** — единственный владелец записи прогресса.
  `noteSprintScore` сохраняет `sprintBest` только если лучше; `noteOpeningDone`
  начисляет бонус XP один раз (проверка `openingsStudied` внутри); `normalize`
  и `bumpActivity` — точки, через которые обязаны проходить все новые поля.
- **`src/game/mateGen.ts`** — чистый генератор матов без React:
  `generateMatePuzzle({kind, seed})` детерминирован по seed (mulberry32,
  ≤200 попыток, иначе `FALLBACK_BANK` — 10 проверенных позиций 5+5);
  `verifyMateInN(fen, n)` перебирает на chess.js, для n=2 — forced-мат
  (все ответы противника).
- **`src/ai/client/engineClient.ts`** — RPC над Worker по протоколу
  `EngineRequest/EngineResponse`; фабрика воркера injectable для тестов;
  sync-fallback для окружений без Worker.
- **`src/lib/supabase.ts`** — единственный клиент Supabase; `supabaseEnabled`
  = заданы `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` и не задан
  `VITE_LOCAL_ADMIN=1`; иначе `supabase === null` и всё приложение офлайн.
- **`src/components/admin/`** — `AdminGate` (установка пароля при первом входе /
  вход, после успеха рендерит детей) и `AdminPanel` (вкладки Дашборд /
  Пользователи / Премиум / Настройки: `DashboardTab`, `UsersTab`, `PremiumTab`,
  `SettingsTab`). Вся работа с данными — только через `admin/store.ts` и
  `admin/auth.ts`, никаких прямых обращений к localStorage из UI.
- **Навигация** — `src/App.tsx`, union `Screen`; контексты (Auth, Subscription,
  Theme, I18n) — провайдеры вокруг дерева; экраны общаются с App колбэками-пропами
  (`onSprintScore`, `onOpeningDone`, `onOpenStats`, `onOpenAdmin`, …).

## Конвенции

- Комментарии в коде — по-русски, содержательные. Именование: компоненты
  PascalCase, хуки `use*`, контексты `*Context.tsx`, i18n-ключи camelCase,
  константы UPPER_SNAKE.
- Стили: Tailwind-утилиты + CSS-переменные из `src/index.css`
  (`var(--bg-primary)` и родня); готовые классы `.glass-card`,
  `.btn .btn-primary/.btn-gold/.btn-secondary/.btn-danger`, `.text-gold-accent`.
- i18n: каждый пользовательский текст — ключ в ОБОИХ словарях `dictionary.ru`
  и `dictionary.en` (`src/contexts/I18nContext.tsx`); пропущенный ключ
  возвращается сам (`t()` = `dictionary[lang][key] || key`).
- localStorage-ключи формата `chessup-*` не переименовывать — совместимость
  с данными игроков; новые поля `UserProgress` проходят и `normalize()`, и
  `defaultProgress`.
- Эмодзи — часть учебного контента в `src/data/theory.ts` и `src/data/course.ts`
  (а также `hint` в `puzzles.ts` и логотип ♟) — не «вычищать».
- Коммиты: формат «M8: тема1, тема2» (как в истории), не conventional commits.

## Бэкенд (Supabase, только когда включён)

- auth + таблица `profiles` (role, banned); ban: `profiles.banned boolean
  not null default false`, SQL-функция `is_admin()`, RLS «admin profiles
  select/update» (`supabase/migrations/20261101000000_admin_tools.sql`).
  AuthContext после `signInWithPassword` читает `banned` и при `true` делает
  `signOut()` + ошибку `banned` (i18n-ключ `loginBanned`).
- edge functions: `create-invoice` / `check-payment` → NOWPayments,
  `ai-coach` → LLM; миграция AI-коуча — `supabase/migrations/20260821000000_ai_coach.sql`.

## Ворота качества

- `npm run check` = oxlint + `tsc -b` + vitest — обязательный перед мержем.
- `npm run test:coverage` — покрытие `src/ai/**` ≥85% (lines/functions/
  statements) и ≥75% branches; barrel-файлы и entry-point воркера исключены.
- Тесты идут в happy-dom без Web Worker — код, требующий Worker, обязан иметь
  fallback (см. `engineClient`).
- CI (`.github/workflows/ci.yml`): check + production-сборка на каждый push/PR.
- Характеризационные тесты (`src/game/__tests__`) фиксируют публичный контракт
  движка; чистые модули (`mateGen`, `admin/auth`, `admin/store`, `normalize`)
  тестируются напрямую, без React.
