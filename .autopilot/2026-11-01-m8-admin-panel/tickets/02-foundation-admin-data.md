# 02 — Фундамент: типы, backfill, вход админа, данные панели

**Требования:** R07i, R04, R05.1, R05.2, R02.1, R02.2
**Зависит от:** —
**Зона:** `src/types/index.ts` · `src/lib/pbkdf2.ts` · `src/admin/` · `src/hooks/useProgress.ts` (+ тесты `src/admin/__tests__/`, `src/hooks/__tests__/`)
**Волна:** 1
**Ревью:** да — фундамент (на этом строят 03–05)
**Модель:** сильная

## Что должно заработать

Слои данных и входа, на которых соберётся всё остальное: новые поля прогресса не ломают старые сохранения; модуль входа админа хранит только хеш; модуль данных панели умеет считать дашборд по реальным данным устройства. UI в этом таске не строится — только API, типы и тесты.

## Из брифа, дословно

> «добавь систему админпанели» · «и хорошего дашборда» (данные под оба)

## Разделы спецификации

Истории 1 (хеш-часть), 6–7 (данные KPI), 13 (данные статистики), 15–17 (поля `sprintBest`/`openingsStudied`/`activityLog`). Полный контракт имён — `interfaces.md`: `src/admin/auth.ts`, `src/admin/store.ts`, типы `Promo/SprintBest/LocalPlan/DashboardData`, новые поля `UserProgress`, новый API `useProgress` (`noteSprintScore`, `noteOpeningDone`, `bumpActivity`).

## Критерии приёмки

- [ ] `adminPasswordExists/setupAdminPassword/verifyAdminPassword/startAdminSession/adminSessionActive/endAdminSession` работают по контракту; в localStorage только `saltHex:hashHex`, пароля нигде нет
- [ ] Сессия истекает через 30 минут (тест подменяет время)
- [ ] `validatePromo` возвращает `not_found / exhausted / inactive` по контракту (тесты на все три + успех)
- [ ] `aggregateDashboard()` на фикстуре из двух прогрессов считает `userCount, active7d, totalXp, totalSolved, premiumCount, activity14 (14 слотов), weakThemes, hardestPuzzles` (тест)
- [ ] Старое сохранение без новых полей после `normalize()` получает `activityLog={}, sprintBest=null, openingsStudied=[]` и проходит проверку (тест)
- [ ] `noteSprintScore` пишет рекорд только если лучше; `noteOpeningDone` даёт XP один раз на дебют (тесты)
- [ ] `npm run check` зелёный
