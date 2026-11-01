# Notes: разведка кода M8 (chess-duolingo) под админ-панель + дашборд

Дата: 2026-11-01. Только чтение. Все пути от корня проекта.

---

## 1. Карта проекта

```
src/
  App.tsx                 — каркас: screen-state «роутинг», top bar, bottom nav, SettingsScreen (внутри App.tsx)
  main.tsx                — точка входа
  index.css               — единственный глобальный CSS: переменные тем, @theme, .glass-card, .btn, keyframes
  types/index.ts          — все контракты (Puzzle, Lesson, UserProgress, MistakeEntry, GameRecord, DailyMission, Achievement)
  components/             — 19 экранов/виджетов: AuthScreen, BeginnerCourse, ChessPuzzle, CoachTip, Confetti,
                            DailyScreen, LeagueCard, LessonMap, LessonPath, Onboarding, PlayScreen, PracticeScreen,
                            PremiumScreen, Profile, ReviewScreen, StaticBoard, StreakStrip, TheoryModal, TransferCard
  ai/                     — AI-слой без React:
    engine/               — шахматный движок (search, evaluation, levels, positionKey, worker, types, index)
    client/engineClient.ts— RPC-клиент над Web Worker (+ sync-fallback)
    coach/                — LLM-тренёр (coachService, cache, prompts, types) + edge-функция supabase/functions/ai-coach
  game/engine.ts          — @deprecated тонкая обёртка над src/ai/engine
  hooks/                  — useProgress, useEngine, useCoach
  contexts/               — AuthContext, I18nContext, ThemeContext, SubscriptionContext
  data/                   — puzzles.ts (65 задач), lessons.ts (13 уроков + defaultProgress), theory.ts (13 тем), course.ts (10 слайдов)
  services/cryptoPay.ts   — оплата через Supabase edge functions (NOWPayments)
  lib/supabase.ts         — единственный клиент Supabase + флаг supabaseEnabled
supabase/
  functions/              — ai-coach, create-invoice, check-payment
  migrations/             — 20260821000000_ai_coach.sql (coach_cache, coach_usage)
scripts/                  — ~40 mjs-скриптов: supabase-setup.sql, create-admin.mjs, check-roles.mjs, gen-icons.mjs,
                            lichess-import.mjs, validate-puzzles.mjs, test-league.mjs, check-admin-login.mjs (untracked), rotate-token.mjs (untracked)
docs/                     — ARCHITECTURE.md, adr/0001..0003, IOS_BUILD.md, screens/ (8 png), M8-Presentation.pdf
android/, src-tauri/      — обёртки Capacitor/Tauri; public/ — иконки PWA
```

Команды (package.json):
- `npm run dev` (vite), `npm run build` = `tsc -b && vite build`, `npm run preview`
- `npm run lint` (oxlint), `npm test` (vitest run), `npm run test:watch`, `npm run test:coverage`, `npm run check` = lint + tsc -b + vitest (delivery gate)
- `npm run tauri:dev` / `tauri:build`; `npm run build:tauri`; `cap:sync`, `cap:android`

## 2. Типы прогресса (src/types/index.ts)

- `Puzzle` (index.ts:1–10): `id, fen, solution: string[] /* SAN */, hint, theme, difficulty: 1|2|3|4|5, xp, rating`
- `Lesson` (index.ts:12–20): `id, title, theme, puzzles: string[] /* ID задач */, completed, locked, position: {x,y}`
- `MistakeEntry` (index.ts:23–30): `puzzleId, fen, playedSan, correctSan, theme, ts`
- `GameRecord` (index.ts:33–41): `id, date, mode: 'ai'|'hotseat', level?, color?: 'w'|'b', result: 'w'|'b'|'draw', moves: string[] /* SAN */`
- `DailyMission` (index.ts:44–50): `id, goal, progress, bonusXp, claimed`
- `UserProgress` (index.ts:52–74) — дословно:
  - `xp: number`, `level: number`, `streak: number`, `lastPlayed: string|null` (YYYY-MM-DD)
  - `completedPuzzles: string[]`, `completedLessons: string[]`, `currentLesson: string|null`
  - `puzzleElo: number` (старт 1000)
  - `daily: { dateKey: string; missions: DailyMission[]; dailyPuzzleDone: boolean }`
  - `weekly: { weekKey: string; xp: number; lastPlace: number|null }`
  - `leagueDiv: 1|2|3` (1 золото, 3 бронза)
  - `survivalBest: { xp, combo, date } | null`
  - `mistakes: MistakeEntry[]` (хвост 100, useProgress.ts:296), `gameHistory: GameRecord[]` (хвост 20, useProgress.ts:315)
- `Achievement` (index.ts:76–82) — только в UI, в прогрессе не хранится
- `defaultProgress` — src/data/lessons.ts:126–141 (xp 0, level 1, puzzleElo 1000, leagueDiv 3)

Уровень = `Math.floor(xp/100)+1` (useProgress.ts:158). XP за задачу 10–20 (puzzles.ts).

## 3. Хранилище

- useProgress (src/hooks/useProgress.ts):
  - ключ на пользователя: `keyFor(userId) = 'chessup-progress:' + userId` (useProgress.ts:8); при нет `user.id` — `'chessup-progress:guest'` (:170)
  - legacy-ключ `'chess-duolingo-progress'` (:7) мигрируется при первой загрузке (loadProgress :129–145)
  - сохранение: `localStorage.setItem(storageKey, JSON.stringify(progress))` в useEffect (:183–189)
  - `normalize()` (:97–127) дозаполняет поля, ресетит daily (новый день → миссии `missionsForDate`) и weekly (новая неделя → подсчёт места среди ботов `leagueBots`, повышение/понижение leagueDiv)
  - API хука: `progress, loaded, completePuzzle, noteExternalSolved, noteDailyPuzzleDone, notePuzzleFailed, completeLesson, recordMistake, removeMistake, addGame, noteSurvivalScore, resetProgress, replaceProgress` (:337–343)
- TransferCard (src/components/TransferCard.tsx): экспорт/импорт строки профиля
  - `encodeProfile(p)` :19–24 → `'CHUP1.' + checksum(b64).toString(36) + '.' + btoa(unescape(encodeURIComponent(json)))`; префикс `CHUP1` (:11)
  - `decodeProfile(code)` :26–43 — проверка префикса и checksum, валидация `typeof data.xp === 'number'`
  - импорт идёт через `onImport → replaceProgress` (App.tsx:330, useProgress.ts:333)

## 4. Аутентификация (src/contexts/AuthContext.tsx)

- `User = { id, username, email }` (:4–8); `authMode: 'supabase' | 'local'` (:18)
- Локальный режим: `USERS_KEY='chessup-users'` (:27), `SESSION_KEY='chessup-session'` (:28)
  - `StoredUser = { username, email, salt?, hash?, password? }` (:32–38); PBKDF2-SHA256 100k итераций, формат `saltHex:hashHex` (:50–57)
  - **LOCAL_ADMIN (:43–48): email `admin@m8chess.com`, пароль `[REDACTED:ADMIN_PASSWORD]` (в открытом виде!), `id='local-admin'`, username `admin`; приоритетный вход в обход сети (localLogin :94–100)**
- **Механизм user.id → ключи прогресса: у локальных пользователей `id = email`** (localLogin :120, localRegister :132); у Supabase — `u.id` (UUID auth.users, :152–156, :188–192). Прогресс/подписка ключуются от `user.id || 'guest'` (useProgress.ts:170, SubscriptionContext.tsx:21,35) — т.е. у каждого пользователя свой прогресс, админ имеет отдельный `'chessup-progress:local-admin'`
- Supabase-режим: `supabase.auth.signInWithPassword` / `signUp` / `onAuthStateChange` (:181–214); локальная сессия в supabase-режиме игнорируется/сбрасывается (:142, :158–161)
- src/lib/supabase.ts: клиент создаётся из `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`; `supabaseEnabled = Boolean(url && anonKey) && !forceLocal`, где `forceLocal = import.meta.env.VITE_LOCAL_ADMIN === '1'` (supabase.ts:7–10) — флаг принудительного локального режима. `.env` заполнен (не в git, см. .gitignore:27–29)

## 5. Шахматный движок

Публичный API src/ai/engine (index.ts):
- `searchBestMove(fen, level, options?) → SearchResult` и `bestMove(fen, level) → string|null` (search.ts:162, :249); `SearchResult = { san: string|null, depth, scoreCp, nodes, timeMs }` (types.ts:18–25); `SearchOptions = { timeBudgetMs?, maxDepth?, rng?, onProgress? }`
- `levelConfig, LEVELS, MIN_LEVEL=1, MAX_LEVEL=8` (levels.ts:8–25): 8 персон — depth 1..6, timeBudget 120–800 мс, `noise` (сантипешки) и `blunderChance` (уровни 1–3)
- `evaluate, PIECE_VALUE` (evaluation.ts); `MATE_SCORE=100_000`, `MATE_IN_MAX` (types.ts:55–56); `positionKey(game)` = первые 4 поля FEN (positionKey.ts:10–12)
- **Поиск хода: да, полный перебор — negamax + альфа-бета + итеративное углубление + TT (150k записей) + quiescence (MVV-LVA, дельта-отсечение) + расширение шаха, MAX_PLY=96 (search.ts:68–129, :20–23). Мат считается как `MATE_SCORE − ply` (:74, :137) — движок гарантированно находит мат в 1–2 даже на уровне 8 (тесты: `src/ai/engine/__tests__/engine.tactics.test.ts:19` «находит мат в 1», :27 «находит мат в 2 и возвращает матовый счёт»). Для «найти мат» можно звать `searchBestMove(fen, 8, { timeBudgetMs: … })` и смотреть `scoreCp >= MATE_IN_MAX`.**
- Worker: src/ai/engine/worker.ts — протокол `EngineRequest|EngineResponse` (types.ts:43–52); 'stop' физически не обрабатывается, отмена на клиенте по id
- useEngine (src/hooks/useEngine.ts:12–33): возвращает `{ findBestMove(fen, level): Promise<string|null>, stop() }`; новый вызов отменяет предыдущий; под капотом синглтон `engineClient` (src/ai/client/engineClient.ts:141), при недоступности Worker — sync-fallback в setTimeout (:79–91)
- src/game/engine.ts — @deprecated: реэкспорт `searchBestMove`, `bestMove`, `bestMoveAsync` (с декоративной задержкой 200–500 мс)

## 6. Экраны (App.tsx)

- Роутинг: `type Screen = 'map'|'lesson'|'puzzle'|'play'|'daily'|'practice'|'review'|'profile'|'settings'|'premium'` (App.tsx:33) + `useState<Screen>('map')` (:38). **Новый экран = добавить в union, кнопку в top bar (:179–262) или bottom nav (:342–398), блок рендера в `<main>` (:264–332); настройки живут в локальном `SettingsScreen` внутри App.tsx:404–547** (там: user card, язык, тема, подписка, TransferCard, курс новичка, logout)
- Top bar: уровень+XP-бар, стрик (Flame), кнопки play/daily/profile (hidden md:block), корона premium, шестерёнка
- Bottom nav (mobile): 5 вкладок — lessons, play, daily (с точкой непринятых миссий), profile, settings
- PlayScreen (412 строк): `mode: 'menu'|'ai'|'hotseat'` (:24), уровень `useState(3)`, пикер [1..8] (:186), выбор цвета, сдача `resign` (:143), **undo НЕТ** (только просмотр партии `viewGame`/`viewIdx`), watchdog 12 с на ход ИИ (:101), история из `progress.gameHistory`, CoachTip, StaticBoard
- DailyScreen (158 строк): миссии дня из `progress.daily.missions` + детерминированная «задача дня» (`dailyPuzzleFor` по хешу dateKey, DailyScreen.tsx:26–31), кнопка в Practice
- PracticeScreen (258 строк): `mode: 'menu'|'practice'|'survival'` (:17); фильтры темы/«только нерешённые», очередь `buildQueue(elo, ...)`; **Выживание: 3 жизни, комбо, таймер 45 с на задачу, `noteSurvivalScore`**
- ReviewScreen (183 строки): тетрадь ошибок — очередь из `progress.mistakes` (дедуп по puzzleId+fen), `themeStats` → «слабые темы», «прорешать заново» (`noteExternalSolved` с source='review' — без Эло и миссий, useProgress.ts:204, :214)
- ChessPuzzle (735 строк): доска, попытки, подсказка, CoachTip; `onComplete(xp, {mistakes, hintUsed})`, `onWrongMove` → recordMistake

## 7. Данные контента

- src/data/puzzles.ts: **65 задач** (65 уникальных `id: 'lp-*'`, импорт из lichess, рейтинг 827–1600). Поля — см. `Puzzle` выше. Распределение длины `solution`: 8×1 ход, 37×3 хода, 20×5 ходов. Подсказки шаблонные с повторами (см. §11)
- src/data/lessons.ts: **13 уроков** (basics-1..3, intermediate-1..4, advanced-1..5, endgame-1), по 5 задач; `FREE_LESSON_COUNT = 3` (lessons.ts:3); `defaultProgress` (:126)
- src/data/theory.ts: **13 TheoryEntry** (theme, title{ru,en}, text{ru,en}, exampleFen)
- src/data/course.ts: **10 CourseSlide** (icon-эмодзи фигур, title/text{ru,en}, fen?)

## 8. i18n, тема, подписка, оплата

- I18nContext (src/contexts/I18nContext.tsx): `dictionary: Record<'ru'|'en', Record<string,string>>` — ru :6–194, en :195–383 (~188 ключей). `t(key)` = `dictionary[lang][key] || key` (:417) — при отсутствии ключа вернётся сам ключ. Язык в `localStorage['chessup-lang']` (:394). Подстановки (`{n}`, `{xp}`, `{combo}`) — ручные `.replace` в компонентах (напр. DailyScreen.tsx:41 `missionText`). **Новая строка = добавить ключ в оба словаря ru и en**
- ThemeContext (ThemeContext.tsx): `'light'|'dark'`, хранится в `chessup-theme`, ставит `data-theme` на `<html>` (:27)
- SubscriptionContext (SubscriptionContext.tsx): `Plan = 'free'|'monthly'|'yearly'|'lifetime'`; `isPremium = plan !== 'free'` (:92); `source: 'db'|'local'`; локально на пользователя `chessup-plan:<userId>` (:21); в Supabase — таблица `subscriptions` (`plan`, `paid_until`), `planFromRow` (:24–31), кэш в localStorage для офлайна
- src/services/cryptoPay.ts: провайдер **NOWPayments (не CryptoBot)**. `canPayWithCrypto()` (:5), `createInvoice(plan)` → edge-функция `create-invoice` (:13–23), `checkPayment(invoiceId)` → `check-payment` (:30–43); статусы 'waiting'…'finished' (:25–27). Ключ NPW только в Supabase Secrets

## 9. Место для статистики (что уже показывается)

- Profile.tsx:
  - Hero (:68–115): аватар ♟, username + верификация (галочка при `profiles.role==='admin'`, :23–38), уровень, XP, `puzzleElo`; XP-бар до следующего уровня (100 XP/уровень)
  - StreakStrip (:118–120) — недельная полоса Пн–Вс, активные дни восстанавливаются из `streak`+`lastPlayed` (StreakStrip.tsx:26–32)
  - Кнопка «Тетрадь ошибок» с количеством (:123–139)
  - LeagueCard (:142–144) — фейковые боты `leagueBots(weekKey)` (useProgress.ts:80–92), место `#N`, дивизион 🥇🥈🥉
  - 4 statCard (:147–152): 🧩 решено задач, 📚 уроков пройдено, 🔥 стрик, 🏆 достижения
  - Список 6 достижений с прогресс-барами (:43–50, :155–207), кнопка сброса (:210–216)
- Для админ-дашборда естественные точки расширения: Profile (новые секции), SettingsScreen (ссылка на админку), новый Screen в App.tsx

## 10. Существующие следы админа

- src/components/Profile.tsx:5,23–38 — запрос `supabase.from('profiles').select('role').eq('id', user.id)` → синяя галочка «Verified» при `role==='admin'` (таблица profiles с колонкой role; создание — scripts/create-admin.mjs, check-roles.mjs, supabase-setup.sql)
- src/contexts/AuthContext.tsx:43–48 — LOCAL_ADMIN (офлайн-вход админа, см. §4)
- scripts/check-admin-login.mjs (untracked): через Management API (`SUPABASE_ACCESS_TOKEN`, project ref `skqwdxufsufmtnpaixnj`) выбирает админов (`p.role='admin'`), затем проверяет парольный вход `admin@m8chess.com` с **хардкодом пароля [REDACTED:ADMIN_PASSWORD] в строке 18**
- scripts/rotate-token.mjs (untracked): перевыпуск Supabase Access Token, комментарий «старый утёк в git-историю» (rotate-token.mjs:1)
- README.md:247–255 — секция «Скрипты администрирования»: `SUPABASE_ACCESS_TOKEN`, `ADMIN_PASSWORD`, `NPW_API_KEY`

## 11. Инвентаризация нейрослопа (R03)

(а) Маркетинговая «вода» — почти нет: клише «революционный/unleash/магия/погрузись» grep-ом не находятся. Реальный шаблонный текст — в подсказках задач:
- puzzles.ts: повторы-заготовки: 4×`"Сквозной удар: шах — и фигура позади короля падает. Ищи двойной удар."`, 4×`"Промежуточный ход с шахом меняет картину. Не жалей материала — жертва окупится."`, 4×`"Используй связку — фигура не может уйти. …"`, 3×`"Точная техника эндшпиля решает исход. …"`, 3×`"Открой линию: …"` и т.п.; к каждому лепится восклицание «!»

(б) Избыточные эмодзи в UI-текстах:
- I18nContext.tsx:23–24 и :212–213 — `hintShow: '💡 Показать подсказку'`, `hintHide: '🔒 Скрыть подсказку'` (эмодзи внутри словаря, а не рядом с иконкой)
- App.tsx: ♟ (:134 загрузка), ⭐ (:169 level-up), 👤 (:434 user card), 🇷🇺/🇬🇧 (:461), ☀️/🌙 (:484), 👑/♛ (:506), 🎓 (:528)
- Profile.tsx:44–49 — иконки достижений `🥇🔥⚡♟♛⭐`; :148–151 — statCard `🧩📚🔥🏆`
- PlayScreen.tsx:156–157 (`🏆 won / 💀 lost`), :250 (`🤝🏆💀♟` в истории партий)
- LeagueCard.tsx:23 (`🥇🥈🥉`), :54 (`👑` рядом с «Вы»)
- DailyScreen.tsx:117 (`✅`), Onboarding.tsx:13–17 (`♟🎯🔥`)
- README.md:1–26 — эмодзи в каждом пункте списка функций (🎯📚🎮🎵🎉📊🏅📱⚫⚪🖱️🔔📴♿🔐) и в заголовке `# M8 🏆`

(в) Пустые/шумные комментарии — не найдены (нет «wow/cool/TODO/FIXME»); комментарии в коде содержательные, по-русски. Единственный шум — восклицательные подсказки контента (см. выше)

(г) Дубли и противоречия README ↔ реальность:
- README.md:13 «**30+** шахматных задач» — реально **65** (puzzles.ts); I18nContext.tsx:171/:360 `premiumFeature1: 'Все 13 уроков и 30 задач'` — тоже устарело
- README.md:49 «Откроется на http://localhost:**7200**» — в vite.config.ts порт не задан (будет дефолтный 5173)
- README.md:96 «Тарифы (USD для шлюза): $3.49/$21.9/$44.9» vs PremiumScreen.tsx:12–14 (`299 ₽ / 1 990 ₽ / 3 990 ₽`) — не объяснено, что цены UI в рублях
- Легаси-имя **ChessUp** повсюду в коде: index.css:4 («ChessUp Design System»), TransferCard.tsx:11 (`CHUP1.`), localStorage-ключи `chessup-*` (AuthContext.tsx:27–28, ThemeContext.tsx:13, I18nContext.tsx:394, useProgress.ts:8, SubscriptionContext.tsx21), DESIGN_IMPROVEMENT_PROMPT.md (весь файл называет продукт ChessUp) — при том что продукт уже M8 (README:1, PWA-манифест vite.config.ts:16–17)
- DESIGN_IMPROVEMENT_PROMPT.md:46/:144 — «₽ отображается как ?» — **уже неактуально** (PremiumScreen.tsx:12–14 содержит корректный ₽); файл — мета-промпт для редизайна, не пользовательский
- README.md:200–245 — структура проекта не полная (нет PlayScreen/DailyScreen/PracticeScreen/ReviewScreen/services/lib в перечислении components)

НЕ трогать (эмодзи/стиль — часть контента): src/data/theory.ts и course.ts (иконки-фигуры ♟♙♘♗♖♕♔ в course.ts — учебный материал), сами тексты уроков/теории, `hint` в puzzles.ts как геймплейный контент (менять только повторы, если явно попросит R03), галочка ✓ в StreakStrip.tsx:80, символ ♟ как «лого» в Profile/App.

Плотность slop: README.md (список функций) > App.tsx SettingsScreen + Profile.tsx (эмодзи-иконки) > словарь I18nContext (💡🔒, «30 задач») > LeagueCard/PlayScreen/Onboarding > DESIGN_IMPROVEMENT_PROMPT.md (устаревшие утверждения).

## 12. Тесты

- vitest (vitest.config.ts): environment `happy-dom`, `include: ['src/**/*.test.{ts,tsx}']`; coverage v8 по `src/ai/**`, пороги lines/functions/statements 85, branches 75, исключены barrel `index.ts` и `worker.ts`
- 5 файлов, **46 тестов** (совпадает с README:198):
  - src/game/__tests__/engine.contract.test.ts (7) — контракт старого API (bestMove/bestMoveAsync)
  - src/ai/engine/__tests__/engine.tactics.test.ts (11) — маты в 1–2, матовый счёт, бюджет времени, прогресс, персоны уровней
  - src/ai/client/__tests__/engineClient.test.ts (10) — RPC через воркер с инъекцией фабрики + sync-fallback
  - src/ai/coach/__tests__/cache.test.ts (10) — кэш и ключи промптов
  - src/ai/coach/__tests__/coachService.test.ts (8) — офлайн-режим и вызов edge-функции
- Запуск: `npm test`, `npm run test:watch`, `npm run test:coverage`, полный gate — `npm run check`
- Компонентных тестов нет (testing-library в devDeps, но не используется)

## 13. Стиль кода

- Именование: компоненты PascalCase, хуки `use*`, контексты `*Context.tsx` + `use*()` акcessor с throw вне провайдера; i18n-ключи camelCase; константы UPPER_SNAKE; комментарии на русском, содержательные
- Стили: гибрид — Tailwind-утилиты (включая токенные `text-ink`, `bg-card`, `text-caption` из @theme) + inline `style={{ background: 'var(--bg-primary)' }}` для CSS-переменных (App.tsx:132,142 и почти везде; DESIGN_IMPROVEMENT_PROMPT.md:41 утверждает ~280 inline-блоков)
- CSS-переменные (src/index.css):
  - новые токены :root/[data-theme="dark"] (:9–62): `--bg, --bg-card, --bg-elevated, --line, --header, --glass-bg, --glass-border, --ink, --ink-secondary, --ink-muted, --accent, --success, --danger, --gold, --board-light, --board-dark`
  - легаси-алиасы для миграции (:32–41): `--bg-primary, --bg-secondary, --bg-tertiary, --border-color, --header-bg, --text-primary, --text-secondary, --text-muted, --color-gold` (именно их видит админ-код в style={{}})
  - `@theme inline` (:65–100) мапит токены в Tailwind (`bg-card`, `text-ink`, `border-line`, `text-display/h1/h2/caption`, `shadow-subtle/medium/gold`)
  - готовые классы: `.glass-card`, `.display-title`, `.text-gold-accent`, `.btn .btn-primary/.btn-gold/.btn-secondary/.btn-ghost/.btn-danger`, `.animate-*`, `.no-scrollbar`, `.chess-square-light/dark`
- Коммиты: всего 2 — `6242375 M8: PDF-презентация, офлайн-вход админа, относительные пути фигур, Netlify-деплой`, `4566c95 M8: шахматный тренажёр в стиле Duolingo (React + TS + PWA + Tauri + Capacitor)` — формат «M8: тема1, тема2, …», не conventional commits

## Красные флаги

1. **Пароль встроенного админа хардкодом в исходниках**: AuthContext.tsx:45 и scripts/check-admin-login.mjs:18 (`[REDACTED:ADMIN_PASSWORD]`) — попадёт в бандл.
2. scripts/rotate-token.mjs:1 — «старый (Supabase access token) утёк в git-историю»; project ref `skqwdxufsufmtnpaixnj` светится в нескольких скриптах.
3. README/контент-цифры расходятся с данными (30 vs 65 задач; порт 7200; USD vs ₽) — править до демо.
4. Легаси-имя ChessUp в localStorage-ключах — при переименовании ключей потеряется прогресс пользователей; не трогать без миграции.
5. rus.traineddata (5 МБ) в корне + скрипты презентации (make-presentation.mjs, tesseract/pdf-lib в devDeps) — мусор, не связанный с приложением (в .gitignore `*.traineddata` уже есть, но файл лежит).
6. `.env` с реальными ключами Supabase присутствует локально (в git не трекается — ок); `.gitignore` имеет несуществующий хвост-паттерн `.autopilot/serve.*`.
