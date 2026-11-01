# M8

Интерактивное приложение для обучения шахматам в стиле Duolingo.

🎮 **Открыть в браузере:** [m8-chess.netlify.app](https://m8-chess.netlify.app) · 💾 **Скачать:** [Windows (EXE)](https://m8-chess.netlify.app/M8_1.0.0_x64-setup.exe)

[Презентация приложения (PDF)](docs/M8-Presentation.pdf) — скриншоты всех экранов и возможностей.

## Описание

M8 — это образовательное приложение, которое делает изучение шахмат увлекательным и доступным. Решай задачи, открывай новые темы, набирай XP и отслеживай свой прогресс.

## Функции

- **65 шахматных задач** по различным темам (мат в 1, вилка, связка, сквозной удар, открытый удар, мат в 2, отвлечение, эндшпиль и др.)
- **13 уроков** с постепенным увеличением сложности
- **Тренажёр дебютов** — 6 дебютов с пошаговым вводом ходов и бонусом XP за первое прохождение
- **Генератор матов** — бесконечные задачи «мат в 1» и «мат в 2» с проверкой движком
- **Блиц-спринт** — 3 минуты, максимум задач, неверный ход отнимает 10 секунд, рекорд сохраняется
- **Игра с другом** — режим hotseat: имена игроков, автопереворот доски, счёт серии, отмена хода
- **Интерактивная доска** с выделением доступных ходов (точки на пустых клетках, кольца на взятиях) и point-and-click управлением
- **Звуковые эффекты** при правильных/неправильных ходах
- **Анимации конфетти** при прохождении урока и тряска доски при ошибке
- **Система прогресса** с XP, уровнями и сериями; моя статистика: XP по темам, календарь активности, рекорды, счёт партий
- **Достижения и лига** для мотивации
- **Ежедневные миссии** и пазл дня
- **Адаптивный дизайн** для телефонов и ПК, чёрно-белая тема со светлым и тёмным оформлением
- **PWA + офлайн** — устанавливается как приложение, работает без интернета (service worker)
- **Доступность** — клавиатурная навигация по доске, aria-метки, поддержка RU/EN
- **Безопасный вход** — пароли хранятся в виде PBKDF2-хеша, прогресс отдельный у каждого пользователя
- **Админ-панель** — дашборд, управление пользователями, выдача премиума и промокодов, экспорт/импорт данных (вход по паролю, хранимому только как хеш)

## Технологии

- **Vite** — сборка проекта
- **React 19** + **TypeScript** — интерфейс
- **Tailwind CSS v4** — стилизация
- **chess.js** — шахматная логика
- **Tauri 2.0** — сборка десктопного приложения (.exe)
- **Capacitor 6** — сборка мобильных приложений (.apk / .ipa)

## Установка зависимостей

```bash
npm install
```

## Запуск для разработки

```bash
npm run dev
```

Откроется на `http://localhost:5173`

## Сборка web-версии (PWA)

```bash
npm run build
```

Результат будет в папке `dist/`. Сборка включает service worker и `manifest.webmanifest` (генерируются через `vite-plugin-pwa`), поэтому приложение можно установить на телефон/ПК и использовать офлайн.

Перегенерация иконок PWA (нужна после изменения `public/favicon.svg`):

```bash
node scripts/gen-icons.mjs
```

---

## Настоящая регистрация (Supabase)

Приложение работает в двух режимах:
- **Локальный** (без ключей): аккаунты в браузере устройства, всё офлайн.
- **Supabase** (рекомендуется): настоящая регистрация с подтверждением email, восстановление пароля, аккаунт работает на всех устройствах.

Включение Supabase (5 минут):
1. Создайте проект на [supabase.com](https://supabase.com) (бесплатно).
2. В SQL Editor проекта выполните скрипт `scripts/supabase-setup.sql` (таблицы + триггеры + RLS) и миграцию `supabase/migrations/20261101000000_admin_tools.sql` (колонка `banned` + RLS для админа).
3. Скопируйте `Settings → API` → Project URL и anon public key.
4. Создайте файл `.env` (по образцу `.env.example`) и заполните `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.
5. Пересоберите: `npm run build`.

## Крипто-оплата Premium (NOWPayments)

Принимаются TON, USDT, BTC, ETH и 200+ монет. Схема: приложение → edge-функция Supabase (ключ хранится на сервере) → NOWPayments → страница оплаты → автоподтверждение.

Включение:
1. Зарегистрируйтесь на [nowpayments.io](https://nowpayments.io) → Account → API Keys → создайте ключ.
2. Установите Supabase CLI и выполните:
   ```bash
   supabase secrets set NPW_API_KEY=ваш_ключ
   supabase functions deploy create-invoice
   supabase functions deploy check-payment
   ```
3. Готово — кнопка «Оплатить криптовалютой» на экране Premium станет активной.

Без ключа оплата показывает заглушку, приложение работает полностью.

Тарифы в интерфейсе: месяц 299 ₽ · год 1 990 ₽ · навсегда 3 990 ₽ (меняются в `src/components/PremiumScreen.tsx`). USD-суммы для шлюза NOWPayments (месяц $3.49 · год $21.9 · навсегда $44.9) задаются в `supabase/functions/create-invoice/index.ts` — клиенту показываются только рубли.

---

## Сборка под Windows (.exe) — Tauri

### Требования
- [Rust](https://rustup.rs/) установлен
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/) (для Windows)

### Команды

```bash
# Установка Tauri CLI (если ещё не установлен)
npm install -g @tauri-apps/cli

# Сборка .exe установщика
npm run tauri:build
```

Результат будет в `src-tauri/target/release/bundle/nsis/`.

---

## Сборка под Android (.apk) — Capacitor

Android-проект уже создан (`android/`). Требования: JDK 21 и Android SDK (platforms;android-36, build-tools;34, platform-tools) с переменной `ANDROID_HOME`.

```bash
# Web-сборка + синхронизация с android-проектом
npm run build
npx cap sync android

# APK (из папки android, с JAVA_HOME на JDK 21)
cd android && gradlew assembleDebug
# → app/build/outputs/apk/debug/app-debug.apk
```

Примечание: в пути пользователя есть кириллица — в `android/gradle.properties` уже прописан `android.overridePathCheck=true` (без него сборка падает).

---

## Сборка под iOS (.ipa) — Capacitor

### Требования
- macOS
- [Xcode](https://developer.apple.com/xcode/) установлен
- Apple Developer аккаунт (для публикации)

### Команды

```bash
# Установка зависимостей Capacitor
npm install @capacitor/core @capacitor/ios

# Инициализация iOS-проекта
npx cap add ios

# Сборка web-части и синхронизация с iOS
npm run build
npx cap sync

# Открытие проекта в Xcode
npx cap open ios
```

В Xcode: выберите устройство/симулятор и нажмите **Run**.

---

## ИИ: шахматный движок и LLM-тренёр

**Движок** (`src/ai/engine`) — negamax с альфа-бета, транспозиционной таблицей,
quiescence-поиском и итеративным углублением. Поиск выполняется в Web Worker —
главный поток не блокируется; у каждого уровня сложности свой бюджет времени
(120–800 мс). Уровень 8 решает маты в 1–2 хода (метрики: `docs/ARCHITECTURE.md`).

**LLM-тренёр** (`src/ai/coach` + edge-функция `ai-coach`) — подсказки в задачах,
разбор ошибок в тетради и итоговый разбор партии. Работает с любым
OpenAI-совместимым провайдером; ключ хранится только в Supabase Secrets:

```bash
# 1. Применить таблицы кэша и квот в SQL Editor:
#    supabase/migrations/20260821000000_ai_coach.sql
# 2. Задать секреты:
supabase secrets set AI_PROVIDER_KEY=sk-...
supabase functions deploy ai-coach
```

Квоты: free — 5 вопросов/день, Premium — 50. Ответы кэшируются на клиенте и
сервере — повторы бесплатны и работают офлайн. Без Supabase тренёр скрыт,
приложение полностью работает офлайн.

## Качество и тесты

```bash
npm run check           # delivery gate: oxlint + tsc -b + vitest
npm test                # только тесты
npm run test:coverage   # покрытие AI-слоя (порог 85%)
```

Тесты (85 в 12 файлах): контракт старого API движка, тактика (маты в 1–2),
бюджет времени, персоны уровней, RPC-клиент воркера, кэш и сервис тренёра,
генератор матов, админ-аутентификация и хранилище панели, бэкфилл прогресса,
легальность дебютных линий.

## Структура проекта

```
chess-duolingo/
├── src/
│   ├── ai/                    # AI-слой (без зависимостей от React)
│   │   ├── engine/                 # Движок: search, evaluation, levels, worker
│   │   ├── coach/                  # LLM-тренёр: service, cache, prompts
│   │   └── client/                 # engineClient: RPC над Web Worker
│   ├── admin/                 # Логика админ-панели (без React)
│   │   ├── auth.ts                 # Пароль и сессия админа (PBKDF2, TTL 30 мин)
│   │   └── store.ts                # Данные панели: пользователи, планы, промокоды, дашборд
│   ├── components/            # React-компоненты
│   │   ├── ChessPuzzle.tsx         # Шахматная доска и логика задач
│   │   ├── LessonMap.tsx           # Карта уроков
│   │   ├── LessonPath.tsx          # Путь урока
│   │   ├── PracticeScreen.tsx      # Меню режимов: практика, выживание, спринт, маты
│   │   ├── PlayScreen.tsx          # Игра против ИИ и hotseat, история партий
│   │   ├── DailyScreen.tsx         # Миссии и пазл дня
│   │   ├── StatsScreen.tsx         # Моя статистика
│   │   ├── OpeningsTrainer.tsx     # Тренажёр дебютов
│   │   ├── ReviewScreen.tsx        # Тетрадь ошибок
│   │   ├── PremiumScreen.tsx       # Экран подписки
│   │   ├── CoachTip.tsx            # Кнопка ИИ-тренёра (переиспользуемая)
│   │   ├── Profile.tsx             # Профиль, лига и достижения
│   │   ├── StreakStrip.tsx         # Полоска серии
│   │   ├── LeagueCard.tsx          # Карточка лиги
│   │   ├── TransferCard.tsx        # Экспорт/импорт прогресса (CHUP1)
│   │   ├── AuthScreen.tsx          # Регистрация и вход
│   │   ├── Onboarding.tsx          # Экран приветствия
│   │   ├── TheoryModal.tsx         # Теория к задаче
│   │   ├── StaticBoard.tsx         # Статичная доска
│   │   ├── Confetti.tsx            # Анимация конфетти
│   │   └── admin/                  # AdminGate, AdminPanel, вкладки панели
│   ├── contexts/              # Auth, I18n, Theme, Subscription
│   ├── hooks/
│   │   ├── useProgress.ts    # Логика прогресса (localStorage)
│   │   ├── useEngine.ts      # Поиск хода ИИ в Web Worker
│   │   └── useCoach.ts       # Запросы к LLM-тренёру
│   ├── game/
│   │   ├── engine.ts         # Deprecated-обёртка над src/ai/engine
│   │   └── mateGen.ts        # Генератор и верификатор матов в 1/2
│   ├── data/
│   │   ├── lessons.ts        # 13 уроков, задачи уроков
│   │   ├── puzzles.ts        # 65 задач практики
│   │   ├── openings.ts       # 6 дебютов для тренажёра
│   │   ├── theory.ts         # Теория по темам
│   │   └── course.ts         # Курс новичка
│   ├── lib/
│   │   ├── pbkdf2.ts         # Хеширование паролей
│   │   └── supabase.ts       # Клиент Supabase
│   ├── services/
│   │   └── cryptoPay.ts      # Оплата через NOWPayments
│   ├── types/
│   │   └── index.ts          # TypeScript типы
│   ├── App.tsx               # Главный компонент и экраны
│   ├── main.tsx              # Точка входа
│   └── index.css             # Дизайн-система, токены, анимации
├── supabase/
│   ├── functions/            # Edge functions (create-invoice, check-payment, ai-coach)
│   └── migrations/           # SQL-миграции (ai_coach, admin_tools)
├── docs/
│   ├── ARCHITECTURE.md       # Слои и потоки данных
│   ├── adr/                  # Архитектурные решения (ADR-0001..0003)
│   └── IOS_BUILD.md
├── src-tauri/                # Конфигурация Tauri (.exe)
│   ├── src/main.rs           # Rust entry point
│   ├── capabilities/         # Разрешения Tauri
│   ├── Cargo.toml            # Rust dependencies
│   └── tauri.conf.json       # Tauri config
├── public/                   # Статические файлы
│   ├── favicon.svg
│   └── icon-*.png            # Иконки PWA (генерируются scripts/gen-icons.mjs)
├── capacitor.config.ts       # Конфигурация Capacitor
├── package.json
├── README.md
└── dist/                     # Production сборка (создаётся)
```

## Скрипты администрирования (scripts/)

Часть скриптов (`create-admin.mjs`, `set-npw-key.mjs`, `deploy-payments.mjs`, `check-admin-login.mjs` и др.) работает с API Supabase и NOWPayments и требует переменных окружения:

```bash
export SUPABASE_ACCESS_TOKEN=...   # Account → Access Tokens на supabase.com
export ADMIN_PASSWORD=...          # читается скриптом из process.env, в репозитории пароля нет
export NPW_API_KEY=...             # ключ nowpayments.io (для set-npw-key.mjs)
```

## Лицензия

MIT
