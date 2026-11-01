window.STATE =
{
  "version": 2,
  "slug": "m8-admin-panel",
  "dir": "2026-11-01-m8-admin-panel--wip",
  "title": "M8: админ-панель, дашборд, новые функции",
  "mode": "semi",
  "depth": "normal",
  "tier": null,
  "briefFile": "2026-11-01-brief.md",
  "memoryFile": "AGENTS.md",
  "memoryOwner": "autopilot",
  "skillDir": "C:/Users/Sы/.zcode/skills/autopilot",
  "baseCommit": null,
  "startedAt": "2026-11-01T16:03:12+03:00",
  "updatedAt": "2026-11-01T16:44:23+03:00",
  "finishedAt": null,
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
      "status": "active",
      "startedAt": "2026-11-01T16:11:32+03:00"
    },
    {
      "id": "plan",
      "status": "pending"
    },
    {
      "id": "build",
      "status": "pending"
    },
    {
      "id": "review",
      "status": "pending"
    },
    {
      "id": "final",
      "status": "pending"
    }
  ],
  "requirements": {
    "total": 7,
    "done": 0,
    "inTicket": 7,
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
      "status": "pending",
      "retries": 0,
      "repairs": 0
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
      "status": "pending",
      "retries": 0,
      "repairs": 0
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
      "status": "pending",
      "retries": 0,
      "repairs": 0
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
      "status": "pending",
      "retries": 0,
      "repairs": 0
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
      "status": "pending",
      "retries": 0,
      "repairs": 0
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
      "status": "pending",
      "retries": 0,
      "repairs": 0
    }
  ],
  "tests": null,
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
  "concerns": [],
  "blind": null,
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
    "2026-11-01T16:44:23+03:00"
  ],
  "rev": 11,
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
    }
  ],
  "reqList": [
    {
      "id": "R01",
      "text": "«проанализируй проект»",
      "status": "in-ticket"
    },
    {
      "id": "R02",
      "text": "«добавь новые функции»",
      "status": "in-ticket"
    },
    {
      "id": "R03",
      "text": "«убери нейрослоп»",
      "status": "in-ticket"
    },
    {
      "id": "R04",
      "text": "«добавь систему админпанели»",
      "status": "in-ticket"
    },
    {
      "id": "R05",
      "text": "«и хорошего дашборда»",
      "status": "in-ticket"
    },
    {
      "id": "R06",
      "text": "«дай новых идей для проекта»",
      "status": "in-ticket"
    },
    {
      "id": "R07i",
      "text": "(подразумевается) у админ-панели есть вход и роли — только админ видит панель",
      "status": "in-ticket"
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
    }
  },
  "result": null
}
