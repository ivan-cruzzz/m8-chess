# Границы, решённые в спецификации

Читают исполнители перед своим таском. Имена — контракт: два параллельных таска не придумывают разные названия одному полю.

## Правила проекта (из кода, обязательны)

- Комментарии в коде — по-русски, содержательные; именование: компоненты PascalCase, хуки `use*`, контексты `*Context.tsx`, i18n-ключи camelCase, константы UPPER_SNAKE.
- Стили: Tailwind-утилиты + inline `var(--bg-primary)` и родня из index.css:32–41; готовые классы `.glass-card`, `.btn .btn-primary/.btn-gold/.btn-secondary/.btn-danger`, `.text-gold-accent`.
- i18n: каждый новый пользовательский текст — ключ в ОБОИХ словарях `dictionary.ru` и `dictionary.en` (I18nContext.tsx), иначе в UI утечёт сам ключ.
- localStorage-ключи не переименовывать (формат `chessup-*` — совместимость с данными игроков).
- Коммиты: формат «M8: тема1, тема2» (как в истории), не conventional commits.
- Эмодзи НЕ трогать в: `src/data/theory.ts`, `src/data/course.ts` (учебный контент), `hint` в puzzles.ts (геймплей, кроме дословных дублей — их переписать), ♟ как логотип.

## Модуль `src/admin/auth.ts` — вход в панель

- **Владеет:** ключом `chessup-admin-hash` (localStorage, формат `saltHex:hashHex`, PBKDF2-SHA-256, 100 000 итераций, соль 16 байт) и `chessup-admin-session` (sessionStorage, значение — ISO-срок истечения, TTL 30 минут от входа).
- **Отдаёт:** `adminPasswordExists(): boolean`, `setupAdminPassword(pw: string): Promise<void>` (падает, если уже существует), `verifyAdminPassword(pw: string): Promise<boolean>`, `startAdminSession(): void`, `adminSessionActive(): boolean`, `endAdminSession(): void`.
- **Скрывает:** формат хеша, имя ключа, TTL.
- Хелпер хеширования переиспользует схему `hashPassword` из AuthContext.tsx:50–57 (можно вынести общий `src/lib/pbkdf2.ts` и использовать в обоих местах — но формат хранения `saltHex:hashHex` не менять).

## Модуль `src/admin/store.ts` — данные панели (без React)

- **Владеет:** чтением чужих прогрессов по ключу `'chessup-progress:' + userId`, промокодами `chessup-promos` (массив `Promo`), локальными планами `'chessup-plan:' + userId`.
- **Отдаёт:**
  - `listLocalUsers(): { email: string; username: string }[]` (из `chessup-users`); `readProgressFor(userId: string): UserProgress | null`; `resetProgressFor(userId: string): void`; `deleteLocalUser(email: string): void` (пользователь + его прогресс + его план).
  - `listSupabaseUsers(): Promise<SupabaseRow[] | null>` — null, когда Supabase выключен; `SupabaseRow = { id, username?, role?, banned? }`; `setUserBanned(id: string, banned: boolean): Promise<void>` (обновление `profiles.banned`, доступно роли admin по RLS).
  - `setUserPlan(userId: string, plan: Plan, untilIso?: string): void`; `revokeUserPlan(userId: string): void`; `listLocalPlans(): { userId: string; grant: LocalPlan }[]`.
  - `savePromo(p: Promo): void`; `listPromos(): Promo[]`; `setPromoActive(code: string, active: boolean): void`.
  - `validatePromo(promos: Promo[], code: string): { ok: true; promo: Promo } | { ok: false; error: 'not_found' | 'exhausted' | 'inactive' }` — чистая, тестируется без React; вызывающий (SubscriptionContext) сам инкрементирует `uses` и сохраняет.
  - `aggregateDashboard(): DashboardData` — собирает KPI + `activity14` + `weakThemes` + `hardestPuzzles` по всем локальным прогрессам (+ Supabase-счётчики, если включён).
- **Скрывает:** имена ключей, шейпы хранения, детали Supabase-запросов.

## Типы — `src/types/index.ts` (добавления)

```ts
interface Promo { code: string; plan: Plan; days: number; maxUses: number; uses: number; active: boolean }
interface SprintBest { score: number; date: string }            // YYYY-MM-DD
interface LocalPlan { plan: Plan; until?: string }              // until — ISO; старая строка-план читается как {plan}
interface DashboardData { userCount: number; active7d: number; totalXp: number; totalSolved: number;
  premiumCount: number; activity14: { date: string; count: number }[];
  weakThemes: { theme: string; count: number }[]; hardestPuzzles: { id: string; theme: string; solvedBy: number }[] }
```

`UserProgress` дополняется: `activityLog: Record<string, number>` (ключ `YYYY-MM-DD`), `sprintBest: SprintBest | null`, `openingsStudied: string[]`. `normalize()` в useProgress дозаполняет их старым профилям (это отдельный таск совместимости — без него старые сохранения падают).

## `src/hooks/useProgress.ts` — новый API хука

- `noteSprintScore(score: number): void` — сохраняет `sprintBest`, если лучше; каждая решённая в спринте задача идёт через существующий `noteExternalSolved` (миссии/Эло работают как в практике).
- `noteOpeningDone(id: string, xp: number): void` — бонус XP один раз (проверка `openingsStudied` внутри).
- Инкремент `activityLog[todayKey]` — внутри `completePuzzle` и `noteExternalSolved` (единая точка `bumpActivity`, не экспортируется).

## `src/contexts/SubscriptionContext.tsx`

- `redeemPromo(code: string): Promise<{ ok: true; plan: Plan } | { ok: false; error: 'not_found' | 'exhausted' | 'inactive' }>` — валидация через `validatePromo`, затем сохранение `{plan, until}` (для `days > 0` — now + days) и инкремент `uses`.
- Чтение локального плана совместимо: строка `'monthly'` → `{plan:'monthly'}`; объект `{plan, until}` — если `until` в прошлом, план = `free`.

## `src/contexts/AuthContext.tsx`

- `LOCAL_ADMIN` (строки 42–48 и ветка в `localLogin`) удаляется целиком — офлайн-вход админа теперь только через панель.
- Supabase-вход: после успешного `signInWithPassword` — `select('banned').eq('id', u.id).from('profiles')`; `banned === true` → `signOut()` + `{ ok: false, error: 'banned' }`. Новый i18n-ключ ошибки `loginBanned`.

## `src/game/mateGen.ts` — генератор матов (чистый, без React)

- `generateMatePuzzle(opts: { kind: 'mate1' | 'mate2'; seed?: number }): { fen: string; solution: string[]; kind: 'mate1' | 'mate2' }` — детерминирован по seed (mulberry32); ≤200 попыток, иначе — `FALLBACK_BANK` (10 проверенных позиций: 5 мат в 1, 5 мат в 2).
- `verifyMateInN(fen: string, n: 1 | 2): boolean` — перебор на chess.js: для n=2 проверяется forced-мат (все ответы противника).
- Наборы фигур для генерации: `[K,K,Q] [K,K,R] [K,K,2R] [K,K,Q,R] [K,K,Q,P] [K,K,R,P] [K,K,2B] [K,K,B,N]` + случайные пустые клетки, короли не рядом, получатель мата не под шахом до хода.

## Данные `src/data/openings.ts`

- `Opening { id: string; name: {ru,en}; side: 'w'|'b'; moves: string[] /* SAN главной линии, 8–12 полуходов */; idea: {ru,en} }`, минимум 6 дебютов: Italian Game, Sicilian Defense, Queen's Gambit, Ruy Lopez, French Defense, Scandinavian Defense. Каждая линия проверена движком chess.js на легальность (тест).

## Компоненты

- `src/components/admin/AdminGate.tsx` — установка пароля при первом входе (два поля + совпадение) / вход; после успеха рендерит детей.
- `src/components/admin/AdminPanel.tsx` — вкладки Дашборд / Пользователи / Премиум / Настройки; дети: `DashboardTab.tsx`, `UsersTab.tsx`, `PremiumTab.tsx`, `SettingsTab.tsx`. Вся работа с данными — только через `admin/store.ts` и `admin/auth.ts`.
- `src/components/StatsScreen.tsx` — «Моя статистика» (сводка, XP по темам, календарь 8 недель из `activityLog`, рекорды, счёт партий из `gameHistory`); пустые состояния по R05.2.1.
- `src/components/OpeningsTrainer.tsx` — выбор дебюта → пошаговый ввод ходов (клик по фигуре → клик по клетке, валидация SAN через chess.js) → финал с `noteOpeningDone`.
- `src/components/PracticeScreen.tsx` — меню расширяется: `sprint` (3:00, −10 c за неверный ход, финиш-экран, `noteSprintScore`), `mats` (выбор «мат в 1/2», генерация через `mateGen`, 3 попытки, показ решения), `openings` (переход в `OpeningsTrainer`). Существующие practice/survival не ломаются.
- `src/components/PlayScreen.tsx` (hotseat) — имена сторон (state, дефолт «Белые»/«Чёрные»), «Реванш», счёт серии в шапке (W:B:D сессии), «Отменить ход» (undo, только в hotseat); существующие режимы ai/menu без изменений.
- `src/App.tsx` — `Screen` += `'admin' | 'stats' | 'openings'`; кнопка «Админ-панель» в `SettingsScreen`, кнопка «Моя статистика» в `Profile` (новый проп `onOpenStats`), дебюты/маты/спринт — из меню Practice.

## Supabase (только когда включён)

- `supabase/migrations/20261101000000_admin_tools.sql`: `alter table profiles add column if not exists banned boolean not null default false;` + RLS-политика: обновлять `banned` может только строка с `role='admin'`; чтение `banned` — сам пользователь и админ.
- Используется существующий `supabase`-клиент из `src/lib/supabase.ts`; новых edge-функций нет.

## Тест-швы (новые тесты кладутся сюда)

- `src/game/__tests__/mateGen.test.ts` — чистый модуль.
- `src/admin/__tests__/auth.test.ts` — чистый async-модуль над localStorage/sessionStorage (happy-dom).
- `src/admin/__tests__/store.test.ts` — `validatePromo`, `aggregateDashboard` на фикстурах прогресса.
- `src/hooks/__tests__/useProgress.backfill.test.ts` — `normalize()` дозаполняет старые профили (если структура хука позволяет прямой вызов; иначе — через экспортируемый чистый хелпер).

## Уточнения после таска 02 (фактические интерфейсы)

- `src/lib/pbkdf2.ts`: `hashPassword(pw: string, saltHex?: string): Promise<string>` (формат `saltHex:hashHex`, PBKDF2-SHA-256 100k), `randomSaltHex(): string`.
- `src/admin/auth.ts`: сигнатуры по контракту выше; сессия — ISO-срок в sessionStorage.
- `src/admin/store.ts`: все методы по контракту; **`aggregateDashboard()` синхронный и локальный** — Supabase-счётчики вкладка Дашборда складывает отдельно через `await listSupabaseUsers()`; `hardestPuzzles` сортируются по возрастанию `solvedBy` (наименее решённые впереди).
- `src/hooks/useProgress.ts`: чистый `normalize()` экспортирован (используется тестами backfill); `bumpActivity` остался внутренним.
- `defaultProgress` в `src/data/lessons.ts` дополнен новыми обязательными полями (3 строки) — необходимая правка вне зоны ради компиляции.

## Уточнения после таска 03 (фактические интерфейсы)

- `src/contexts/SubscriptionContext.tsx`: экспорт `planFromStored(raw: string | null, now?: Date): Plan` — читает и старую строку-план, и `{plan, until}` (until в прошлом → free); `redeemPromo(code)` по контракту. Мгновенная видимость выданного/отобранного плана — window-событие **`chessup-plan-changed`** (компоненты слушают и перечитывают план; в Supabase-режиме локальная выдача перечитывается при смене пользователя/refresh).
- `AuthResult.error` дополнился значением `'banned'`; `src/components/AuthScreen.tsx` маппит его на i18n-ключ `loginBanned` (правка одной строки, вне зоны, принята).
- `src/App.tsx`: `Screen` += `'admin'`; `SettingsScreen` получил проп `onOpenAdmin` (пункт «Админ-панель»).
- `supabase/migrations/20261101000000_admin_tools.sql`: `profiles.banned boolean not null default false`, SQL-функция `is_admin()`, RLS-политики «admin profiles select/update».
- i18n: новые ключи `loginBanned`, `promo*`, `admin*` добавлены в оба словаря (сейчас 265 ключей на язык).

## Уточнения после таска 04 (фактические интерфейсы)

- `src/game/mateGen.ts`: `generateMatePuzzle(opts: { kind: 'mate1' | 'mate2'; seed?: number }): { fen: string; solution: string[]; kind }` (mulberry32, ≤200 попыток, далее банк), `verifyMateInN(fen: string, n: 1 | 2): boolean` (мат ≤ n; n=2 — forced: все ответы противника), `FALLBACK_BANK: readonly MatePuzzle[]` (10 = 5+5), типы `MateKind`, `MatePuzzle`. Мат-в-2 генерируется 0,5–1 c — потребитель готовит следующую позицию заранее.
- `src/components/PracticeScreen.tsx`: `Mode` += `'sprint' | 'mats'`; новый опциональный проп `onSprintScore?(score: number)` — App.tsx передаёт `noteSprintScore` (wiring: 2 строки в App.tsx, деструктуризация + проброс).
- i18n: ключи `sprint*` (Title, Desc, Start, Best, Score, Over, Result, NewRecord) и `mats*` (Title, Desc, MateIn1, MateIn2, Hint1, Hint2, AttemptsLeft, Solution, Generating) в обоих словарях.

## Уточнения после таска 05 (фактические интерфейсы)

- `src/data/openings.ts`: `Opening { id; name{ru,en}; side: 'w'|'b'; moves: string[] /*SAN 8–12*/; idea{ru,en} }`, экспорт `openings: Opening[]` (6 дебютов); `src/data/__tests__/openings.test.ts` — легальность всех линий.
- `src/components/OpeningsTrainer.tsx`: пропы `{ progress, onOpeningDone(id, xp), onExit }`, константа `OPENING_BONUS_XP = 30`; `src/components/StatsScreen.tsx`: пропы `{ progress, onBack }`.
- `src/App.tsx`: `Screen` += `'stats' | 'openings'`; `Profile` += проп `onOpenStats?`; `PracticeScreen` += проп `onOpenOpenings?`.
- PlayScreen hotseat: режим `hotseatSetup` перед партией (ввод имён), серия `{w,b,d}` внутренняя; автопереворот доски реализован в этом таске (в коде его не было — orientation был жёстко 'white', план ошибочно считал иначе); undo — один полуход, только в hotseat.
- i18n: +35 ключей `stats*`/`openings*`/`hotseat*` в обоих словарях.
