window.STATE =
{
  "version": 2,
  "slug": "m8-admin-panel",
  "dir": "2026-11-01-m8-admin-panel",
  "title": "M8: админ-панель, дашборд, новые функции",
  "mode": "semi",
  "depth": "normal",
  "tier": null,
  "briefFile": "2026-11-01-brief.md",
  "memoryFile": "AGENTS.md",
  "memoryOwner": "autopilot",
  "skillDir": "C:/Users/Sы/.zcode/skills/autopilot",
  "baseCommit": "9c7e869",
  "startedAt": "2026-11-01T16:03:12+03:00",
  "updatedAt": "2026-11-01T19:25:20+03:00",
  "finishedAt": "2026-11-01T19:25:20+03:00",
  "stages": [
    {
      "id": "preflight",
      "status": "done",
      "startedAt": "2026-11-01T16:03:12+03:00",
      "finishedAt": "2026-11-01T16:04:31+03:00"
    },
    {
      "id": "manifest",
      "status": "done",
      "startedAt": "2026-11-01T16:04:31+03:00",
      "finishedAt": "2026-11-01T16:06:06+03:00"
    },
    {
      "id": "briefing",
      "status": "done",
      "startedAt": "2026-11-01T16:06:06+03:00",
      "finishedAt": "2026-11-01T16:11:32+03:00"
    },
    {
      "id": "spec",
      "status": "done",
      "startedAt": "2026-11-01T16:11:32+03:00",
      "finishedAt": "2026-11-01T16:45:30+03:00"
    },
    {
      "id": "plan",
      "status": "done",
      "startedAt": "2026-11-01T16:45:30+03:00",
      "finishedAt": "2026-11-01T16:45:30+03:00"
    },
    {
      "id": "build",
      "status": "done",
      "startedAt": "2026-11-01T16:45:30+03:00",
      "finishedAt": "2026-11-01T18:47:48+03:00"
    },
    {
      "id": "review",
      "status": "done",
      "startedAt": "2026-11-01T18:47:48+03:00",
      "finishedAt": "2026-11-01T19:08:33+03:00"
    },
    {
      "id": "final",
      "status": "done",
      "startedAt": "2026-11-01T19:08:33+03:00",
      "finishedAt": "2026-11-01T19:25:20+03:00"
    }
  ],
  "requirements": {
    "total": 7,
    "done": 7,
    "inTicket": 0,
    "inSpec": 0,
    "placeholder": 0,
    "deferred": 0,
    "dropped": 0
  },
  "tickets": [
    {
      "id": "01",
      "title": "Анализ проекта и идеи для отчёта",
      "requirements": [
        "R01",
        "R06"
      ],
      "blockedBy": [],
      "wave": 1,
      "zone": [
        ".autopilot/2026-11-01-m8-admin-panel--wip/"
      ],
      "review": "нет",
      "model": "обычная",
      "status": "done",
      "startedAt": "2026-11-01T16:45:33+03:00",
      "finishedAt": "2026-11-01T16:50:42+03:00",
      "retries": 0,
      "repairs": 0,
      "commit": "b8e9694"
    },
    {
      "id": "02",
      "title": "Фундамент: типы, backfill, вход админа, данные панели",
      "requirements": [
        "R07i",
        "R04",
        "R05.1",
        "R05.2",
        "R02.1",
        "R02.2"
      ],
      "blockedBy": [],
      "wave": 1,
      "zone": [
        "src/types/index.ts",
        "src/lib/pbkdf2.ts",
        "src/admin/",
        "src/hooks/useProgress.ts",
        "src/admin/__tests__/",
        "src/hooks/__tests__/"
      ],
      "review": "да — фундамент (на этом строят 03–05)",
      "model": "сильная",
      "status": "done",
      "startedAt": "2026-11-01T16:45:33+03:00",
      "finishedAt": "2026-11-01T17:13:43+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 63,
        "failed": 1
      },
      "commit": "a3e7ce7"
    },
    {
      "id": "03",
      "title": "Админ-панель: вход, вкладки, премиум с промокодами",
      "requirements": [
        "R07i",
        "R04",
        "R05.1"
      ],
      "blockedBy": [
        "02"
      ],
      "wave": 2,
      "zone": [
        "src/components/admin/",
        "src/contexts/AuthContext.tsx",
        "src/contexts/SubscriptionContext.tsx",
        "src/components/PremiumScreen.tsx",
        "src/App.tsx",
        "supabase/migrations/",
        "src/contexts/I18nContext.tsx"
      ],
      "review": "да — пароли, сессии, блокировка пользователей",
      "model": "сильная",
      "status": "done",
      "startedAt": "2026-11-01T17:27:02+03:00",
      "finishedAt": "2026-11-01T17:37:17+03:00",
      "retries": 0,
      "repairs": 1,
      "repairFindings": [
        "AdminGate читает adminSessionActive один раз при монтировании — открытая панель не возвращается на вход по истечении 30 мин"
      ],
      "tests": {
        "passed": 71,
        "failed": 0
      },
      "commit": "da034f6"
    },
    {
      "id": "04",
      "title": "Блиц-спринт и генератор матов",
      "requirements": [
        "R02.1",
        "R02.3"
      ],
      "blockedBy": [
        "02"
      ],
      "wave": 3,
      "zone": [
        "src/game/mateGen.ts",
        "src/components/PracticeScreen.tsx",
        "src/contexts/I18nContext.tsx",
        "src/game/__tests__/"
      ],
      "review": "нет (алгоритмические тесты прикрывают)",
      "model": "сильная (верификация forced-мата — самая хитрая часть сборки)",
      "status": "done",
      "startedAt": "2026-11-01T18:07:33+03:00",
      "finishedAt": "2026-11-01T18:07:33+03:00",
      "retries": 0,
      "repairs": 1,
      "repairFindings": [
        "рекорд спринта не сохраняется: не хватает onSprintScore={noteSprintScore} в рендере PracticeScreen в App.tsx"
      ],
      "tests": {
        "passed": 80,
        "failed": 0
      },
      "commit": "9fa367b"
    },
    {
      "id": "05",
      "title": "Статистика игрока, тренажёр дебютов, игра с другом",
      "requirements": [
        "R05.2",
        "R02.2",
        "R02.4"
      ],
      "blockedBy": [
        "02",
        "03",
        "04"
      ],
      "wave": 4,
      "zone": [
        "src/components/StatsScreen.tsx",
        "src/components/OpeningsTrainer.tsx",
        "src/data/openings.ts",
        "src/components/Profile.tsx",
        "src/components/PlayScreen.tsx",
        "src/components/PracticeScreen.tsx",
        "src/App.tsx",
        "src/contexts/I18nContext.tsx",
        "src/data/__tests__/openings.test.ts"
      ],
      "review": "нет",
      "model": "обычная",
      "status": "done",
      "startedAt": "2026-11-01T18:27:41+03:00",
      "finishedAt": "2026-11-01T18:27:41+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 85,
        "failed": 0
      },
      "commit": "8b33577"
    },
    {
      "id": "06",
      "title": "Чистка нейрослопа: README, иконки, словарь, подсказки",
      "requirements": [
        "R03"
      ],
      "blockedBy": [
        "03",
        "04",
        "05"
      ],
      "wave": 5,
      "zone": [
        "README.md",
        "src/contexts/I18nContext.tsx",
        "src/App.tsx",
        "src/components/{Profile,PlayScreen,LeagueCard,DailyScreen,Onboarding}.tsx",
        "src/data/puzzles.ts",
        "scripts/check-admin-login.mjs"
      ],
      "review": "нет",
      "model": "обычная",
      "status": "done",
      "startedAt": "2026-11-01T18:27:46+03:00",
      "finishedAt": "2026-11-01T18:47:45+03:00",
      "retries": 0,
      "repairs": 0,
      "tests": {
        "passed": 85,
        "failed": 0
      },
      "commit": "21e4284"
    },
    {
      "id": "F1",
      "title": "Ремонт ветки по ревью",
      "requirements": [
        "R07i",
        "R04"
      ],
      "blockedBy": [],
      "wave": 6,
      "zone": [
        "src/admin/auth.ts",
        "src/components/admin/",
        "supabase/migrations/20261101000000_admin_tools.sql"
      ],
      "review": "да — ремонт ветки",
      "model": "сильная",
      "status": "done",
      "retries": 0,
      "repairs": 0,
      "startedAt": "2026-11-01T18:55:04+03:00",
      "finishedAt": "2026-11-01T19:07:03+03:00",
      "tests": {
        "passed": 89,
        "failed": 0
      },
      "commit": "e338704"
    }
  ],
  "tests": {
    "passed": 89,
    "failed": 0
  },
  "debt": {
    "placeholders": [],
    "assumptions": [],
    "emptyEnv": []
  },
  "additions": [],
  "coverage": {
    "found": 2,
    "fixed": 2,
    "deferred": 0,
    "items": [
      "состав дебютов не назван в спеке — назван в interfaces.md (6 дебютов)",
      "hotseat формально уже существует — решение «довести до полной» записано в manifest R02.4"
    ]
  },
  "concerns": [
    "baseline: src/ai/client/__tests__/engineClient.test.ts красный до начала сборки — repair-агент запущен",
    "src/hooks/useProgress.ts:98 — комментарий «используется и админ-панелью» ложен: store.ts держит собственный withDefaults — два источника дефолтов backfill (ревью T02)",
    "src/admin/auth.ts:36 — setupAdminPassword глотает ошибку setItem и резолвится успехом: AdminGate не отличит отказ хранилища (ревью T02)",
    "supabase/migrations/20261101000000_admin_tools.sql:33-35 — политика admin profiles update без ограничения колонок: админ может менять role/username, а не только banned (ревью T03)",
    "src/components/admin/SettingsTab.tsx:31,63-64 — экспорт/импорт идёт мимо admin/store и включает в бэкап chessup-admin-hash и хеши паролей из chessup-users (ревью T03)",
    "хелпер fill продублирован: UsersTab.tsx:15, DashboardTab.tsx:6, PremiumTab.tsx:17 (ревью T03)",
    "генерация мат-в-2 занимает до ~1 c — закрывается предгенерацией следующей позиции во время решения (T04)",
    "план считал автопереворот в hotseat существующим — фактически orientation был жёстко 'white', реализован в T05 (зона исполнителя)",
    "косметика: AdminGate при отказе чтения хранилища в пути ЛОГИНА показывает «Неверный пароль» вместо сбоя хранилища (ре-ревью F1, поведение прежнее, не регрессия)"
  ],
  "blind": {
    "checked": 6,
    "matched": 4,
    "mismatches": [
      "R03 нейрослоп: остались тематические глифы ♟/★ в AuthScreen/LessonPath — вне утверждённого спекой перечня экранов чистки (spec R03.2); читатель может счесть их мусором",
      "R06 идеи: список идей лежит в .autopilot/ideas.md — слепой чекер не имел права открывать .autopilot, в клоне не подтверждаемо; доставляется отчётом"
    ]
  },
  "beats": [
    "2026-11-01T16:03:12+03:00",
    "2026-11-01T16:04:31+03:00",
    "2026-11-01T16:06:04+03:00",
    "2026-11-01T16:06:06+03:00",
    "2026-11-01T16:07:58+03:00",
    "2026-11-01T16:11:30+03:00",
    "2026-11-01T16:11:32+03:00",
    "2026-11-01T16:40:01+03:00",
    "2026-11-01T16:44:21+03:00",
    "2026-11-01T16:44:23+03:00",
    "2026-11-01T16:44:48+03:00",
    "2026-11-01T16:45:30+03:00",
    "2026-11-01T16:45:33+03:00",
    "2026-11-01T16:50:42+03:00",
    "2026-11-01T17:08:04+03:00",
    "2026-11-01T17:08:07+03:00",
    "2026-11-01T17:08:09+03:00",
    "2026-11-01T17:13:43+03:00",
    "2026-11-01T17:13:46+03:00",
    "2026-11-01T17:27:02+03:00",
    "2026-11-01T17:27:04+03:00",
    "2026-11-01T17:33:52+03:00",
    "2026-11-01T17:33:54+03:00",
    "2026-11-01T17:37:17+03:00",
    "2026-11-01T18:04:25+03:00",
    "2026-11-01T18:04:28+03:00",
    "2026-11-01T18:07:33+03:00",
    "2026-11-01T18:27:41+03:00",
    "2026-11-01T18:27:43+03:00",
    "2026-11-01T18:27:46+03:00",
    "2026-11-01T18:47:45+03:00",
    "2026-11-01T18:47:48+03:00",
    "2026-11-01T18:54:59+03:00",
    "2026-11-01T18:55:01+03:00",
    "2026-11-01T18:55:04+03:00",
    "2026-11-01T19:07:03+03:00",
    "2026-11-01T19:08:33+03:00",
    "2026-11-01T19:09:33+03:00",
    "2026-11-01T19:09:35+03:00",
    "2026-11-01T19:18:38+03:00",
    "2026-11-01T19:25:20+03:00"
  ],
  "rev": 42,
  "waiting": null,
  "waits": [
    {
      "kind": "briefing",
      "from": "2026-11-01T16:07:58+03:00",
      "to": "2026-11-01T16:11:30+03:00"
    }
  ],
  "log": [
    {
      "t": "2026-11-01T16:03:12+03:00",
      "k": "init"
    },
    {
      "t": "2026-11-01T16:04:31+03:00",
      "k": "stage",
      "id": "manifest",
      "act": "start"
    },
    {
      "t": "2026-11-01T16:06:06+03:00",
      "k": "stage",
      "id": "briefing",
      "act": "start"
    },
    {
      "t": "2026-11-01T16:07:58+03:00",
      "k": "ask",
      "kind": "briefing",
      "note": "4 вопроса: состав новых функций, чей дашборд, зона админ-панели, хранение данных и пароль админа"
    },
    {
      "t": "2026-11-01T16:11:30+03:00",
      "k": "answered",
      "kind": "briefing"
    },
    {
      "t": "2026-11-01T16:11:32+03:00",
      "k": "gate",
      "g": "G1",
      "ok": false,
      "open": 7,
      "total": 7
    },
    {
      "t": "2026-11-01T16:11:32+03:00",
      "k": "stage",
      "id": "spec",
      "act": "start"
    },
    {
      "t": "2026-11-01T16:40:01+03:00",
      "k": "gate",
      "g": "G2",
      "ok": true,
      "found": 2,
      "fixed": 2,
      "deferred": 0
    },
    {
      "t": "2026-11-01T16:44:21+03:00",
      "k": "tickets",
      "n": 6
    },
    {
      "t": "2026-11-01T16:44:23+03:00",
      "k": "gate",
      "g": "G3",
      "ok": true,
      "problems": 0
    },
    {
      "t": "2026-11-01T16:45:30+03:00",
      "k": "stage",
      "id": "build",
      "act": "start"
    },
    {
      "t": "2026-11-01T16:45:33+03:00",
      "k": "ticket",
      "ids": [
        "01",
        "02"
      ],
      "act": "start"
    },
    {
      "t": "2026-11-01T16:50:42+03:00",
      "k": "ticket",
      "ids": [
        "01"
      ],
      "act": "done"
    },
    {
      "t": "2026-11-01T17:08:04+03:00",
      "k": "ticket",
      "ids": [
        "02"
      ],
      "act": "done",
      "tests": {
        "passed": 63,
        "failed": 1
      }
    },
    {
      "t": "2026-11-01T17:08:07+03:00",
      "k": "ticket",
      "ids": [
        "02"
      ],
      "act": "review"
    },
    {
      "t": "2026-11-01T17:08:09+03:00",
      "k": "add",
      "key": "concerns",
      "n": 1
    },
    {
      "t": "2026-11-01T17:13:43+03:00",
      "k": "ticket",
      "ids": [
        "02"
      ],
      "act": "done",
      "tests": {
        "passed": 63,
        "failed": 1
      }
    },
    {
      "t": "2026-11-01T17:13:46+03:00",
      "k": "add",
      "key": "concerns",
      "n": 2
    },
    {
      "t": "2026-11-01T17:27:02+03:00",
      "k": "ticket",
      "ids": [
        "03"
      ],
      "act": "done",
      "tests": {
        "passed": 71,
        "failed": 0
      }
    },
    {
      "t": "2026-11-01T17:27:04+03:00",
      "k": "ticket",
      "ids": [
        "03"
      ],
      "act": "review"
    },
    {
      "t": "2026-11-01T17:33:52+03:00",
      "k": "ticket",
      "ids": [
        "03"
      ],
      "act": "repair",
      "note": "AdminGate читает adminSessionActive один раз при монтировании — открытая панель не возвращается на вход по истечении 30 мин"
    },
    {
      "t": "2026-11-01T17:33:54+03:00",
      "k": "add",
      "key": "concerns",
      "n": 3
    },
    {
      "t": "2026-11-01T17:37:17+03:00",
      "k": "ticket",
      "ids": [
        "03"
      ],
      "act": "done",
      "tests": {
        "passed": 71,
        "failed": 0
      }
    },
    {
      "t": "2026-11-01T18:04:25+03:00",
      "k": "ticket",
      "ids": [
        "04"
      ],
      "act": "repair",
      "note": "рекорд спринта не сохраняется: не хватает onSprintScore={noteSprintScore} в рендере PracticeScreen в App.tsx"
    },
    {
      "t": "2026-11-01T18:04:28+03:00",
      "k": "add",
      "key": "concerns",
      "n": 1
    },
    {
      "t": "2026-11-01T18:07:33+03:00",
      "k": "ticket",
      "ids": [
        "04"
      ],
      "act": "done",
      "tests": {
        "passed": 80,
        "failed": 0
      }
    },
    {
      "t": "2026-11-01T18:27:41+03:00",
      "k": "ticket",
      "ids": [
        "05"
      ],
      "act": "done",
      "tests": {
        "passed": 85,
        "failed": 0
      }
    },
    {
      "t": "2026-11-01T18:27:43+03:00",
      "k": "add",
      "key": "concerns",
      "n": 1
    },
    {
      "t": "2026-11-01T18:27:46+03:00",
      "k": "ticket",
      "ids": [
        "06"
      ],
      "act": "start"
    },
    {
      "t": "2026-11-01T18:47:45+03:00",
      "k": "ticket",
      "ids": [
        "06"
      ],
      "act": "done",
      "tests": {
        "passed": 85,
        "failed": 0
      }
    },
    {
      "t": "2026-11-01T18:47:48+03:00",
      "k": "stage",
      "id": "review",
      "act": "start"
    },
    {
      "t": "2026-11-01T18:54:59+03:00",
      "k": "tickets",
      "n": 7
    },
    {
      "t": "2026-11-01T18:55:01+03:00",
      "k": "add",
      "key": "report",
      "n": 3
    },
    {
      "t": "2026-11-01T18:55:04+03:00",
      "k": "ticket",
      "ids": [
        "F1"
      ],
      "act": "start"
    },
    {
      "t": "2026-11-01T19:07:03+03:00",
      "k": "ticket",
      "ids": [
        "F1"
      ],
      "act": "done",
      "tests": {
        "passed": 89,
        "failed": 0
      }
    },
    {
      "t": "2026-11-01T19:08:33+03:00",
      "k": "stage",
      "id": "final",
      "act": "start"
    },
    {
      "t": "2026-11-01T19:09:33+03:00",
      "k": "tests",
      "passed": 89,
      "failed": 0
    },
    {
      "t": "2026-11-01T19:09:35+03:00",
      "k": "add",
      "key": "concerns",
      "n": 1
    },
    {
      "t": "2026-11-01T19:18:38+03:00",
      "k": "gate",
      "g": "G4",
      "ok": false,
      "checked": 6,
      "matched": 4
    },
    {
      "t": "2026-11-01T19:25:20+03:00",
      "k": "finish",
      "result": "Админ-панель (вход по паролю, дашборд, пользователи, премиум+промокоды, настройки), Моя статистика, спринт, генератор матов, дебюты, полный hotseat, чистка нейрослопа; 89 тестов, 7/7 требований"
    }
  ],
  "reqList": [
    {
      "id": "R01",
      "text": "«проанализируй проект»",
      "status": "done"
    },
    {
      "id": "R02",
      "text": "«добавь новые функции»",
      "status": "done"
    },
    {
      "id": "R03",
      "text": "«убери нейрослоп»",
      "status": "done"
    },
    {
      "id": "R04",
      "text": "«добавь систему админпанели»",
      "status": "done"
    },
    {
      "id": "R05",
      "text": "«и хорошего дашборда»",
      "status": "done"
    },
    {
      "id": "R06",
      "text": "«дай новых идей для проекта»",
      "status": "done"
    },
    {
      "id": "R07i",
      "text": "(подразумевается) у админ-панели есть вход и роли — только админ видит панель",
      "status": "done"
    }
  ],
  "gates": {
    "G1": {
      "ok": false,
      "at": "2026-11-01T16:11:32+03:00",
      "open": 7,
      "total": 7
    },
    "G2": {
      "ok": true,
      "at": "2026-11-01T16:40:01+03:00",
      "found": 2,
      "fixed": 2,
      "deferred": 0
    },
    "G3": {
      "ok": true,
      "at": "2026-11-01T16:44:23+03:00",
      "problems": 0
    },
    "G4": {
      "ok": false,
      "at": "2026-11-01T19:18:38+03:00",
      "checked": 6,
      "matched": 4
    }
  },
  "result": "Админ-панель (вход по паролю, дашборд, пользователи, премиум+промокоды, настройки), Моя статистика, спринт, генератор матов, дебюты, полный hotseat, чистка нейрослопа; 89 тестов, 7/7 требований",
  "report": [
    "Бэкап-экспорт (вкладка Настройки) по букве требования включает ВСЕ chessup-* ключи — в файл попадают хеш пароля админа и PBKDF2-хеши паролей пользователей. Рекомендация: фильтровать учётные ключи при экспорте или предупреждать в UI — решить отдельно.",
    "Визуальный прогон новых экранов не делался (у субагентов нет браузера) — стоит открыть npm run dev и глазами пройти панель/спринт/маты/дебюты/статистику/hotseat.",
    "Комментарий в useProgress.ts про «используется и админ-панелью» неточен, и ChessPuzzle:684 держит no-op replace('💡 ') после чистки словаря — косметика, не влияет на работу."
  ]
}
