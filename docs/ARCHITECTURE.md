# Архитектура M8 (ChessUp)

Документ описывает слои приложения, AI-слой подробнее, потоки данных и
ключевые архитектурные решения. История решений — в `docs/adr/`.

## Обзор слоёв

```
┌────────────────────────────────────────────────────────────┐
│ UI: src/components (экраны), src/App.tsx (навигация)       │
├────────────────────────────────────────────────────────────┤
│ Hooks: src/hooks (useEngine, useCoach, useProgress)        │
├────────────────────────────────────────────────────────────┤
│ AI-слой: src/ai                                           │
│  ├─ engine/  — шахматный движок (pure TS + Web Worker)     │
│  ├─ coach/   — LLM-тренёр (клиент, кэш, промпты)           │
│  └─ client/  — engineClient: RPC над воркером               │
├────────────────────────────────────────────────────────────┤
│ Сервисы: src/services (cryptoPay), src/lib (supabase)      │
├────────────────────────────────────────────────────────────┤
│ Данные: src/data (контент), src/types (контракты)           │
├────────────────────────────────────────────────────────────┤
│ Бэкенд: Supabase (auth, Postgres, edge functions)          │
│  ├─ create-invoice / check-payment → NOWPayments           │
│  └─ ai-coach → OpenAI-совместимый LLM API                  │
└────────────────────────────────────────────────────────────┘
```

Правило зависимостей: стрелки только вниз. `src/ai` не импортирует React
(кроме хуков в `src/hooks`), UI не знает о Supabase напрямую — только через
сервисы и контексты.

## AI-слой

### Шахматный движок (`src/ai/engine`)

- **search.ts** — negamax с альфа-бета, итеративным углублением и жёстким
  бюджетом времени (abort каждые 255 узлов), транспозиционной таблицей
  (точные строковые ключи из префикса FEN, кэш матовых оценок исключён),
  quiescence-поиском (MVV-LVA + дельта-отсечение), расширением шаха,
  killer/history-эвристиками, матовым счётом `MATE_SCORE − ply`.
- **evaluation.ts** — материал + PST + пара слонов + структура пешек
  (двойные/изолированные/проходные) + пешечный щит короля в миттельшпиле.
- **levels.ts** — персоны уровней 1–8: `{depth, timeBudgetMs, noise,
  blunderChance}`. Слабые уровни «зевкают» и размывают оценку шумом.
- **worker.ts** — entry-point воркера: протокол `EngineRequest/EngineResponse`.
- **positionKey.ts** — ключ позиции для TT (см. ADR-0001 об отказе от
  инкрементального Zobrist на адаптере chess.js).

Поток: `PlayScreen → useEngine → engineClient (синглтон) → Worker →
searchBestMove → search-result по id → SAN применяется к партии`.
Отмена запроса — по id на клиенте (воркер занят поиском до конца бюджета;
максимум занятости ограничен `timeBudgetMs` уровня). Без Worker (старые
WebView) — синхронный fallback в setTimeout с тем же бюджетом.

Совместимость: `src/game/engine.ts` — deprecated-обёртка над новым движком.

### LLM-тренёр (`src/ai/coach` + edge function `ai-coach`)

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

## Ворота качества

- `npm run check` = oxlint + `tsc -b` + vitest — обязательный перед мержем.
- `npm run test:coverage` — покрытие `src/ai/**` ≥85% (lines/functions/
  statements) и ≥75% branches; barrel-файлы и entry-point воркера исключены.
- CI (`.github/workflows/ci.yml`): check + production-сборка на каждый push/PR.
- Характеризационные тесты (`src/game/__tests__`) фиксируют публичный контракт
  движка при миграциях.

## Замеренные метрики (этап миграции движка)

| Метрика | Старый движок | Новый движок |
|---|---|---|
| Уровень 8, миттельшпиль (та же позиция) | ~7 600 мс, главный поток заблокирован | ~900 мс, главный поток свободен (Worker) |
| Поиск ходов | синхронно в UI-потоке | Web Worker + бюджет времени |
| Тактика | маты не различаются (оценка только по материалу) | маты в 1–2 решаются, матовый счёт в ответе |
| Уровни | глубина 1–3 | глубина 1–6 с персонами и бюджетом |

Замер стенда: Node 24, Windows, vitest. Повторный прогон: `npx vitest run
src/ai/engine/__tests__/engine.tactics.test.ts`.
