// Проверка исправленных leagueBots и missionsForDate на множестве ключей
const BOT_NAMES = [
  'Алексей', 'Марина', 'Гоша', 'Лиза', 'Виктор', 'Нина', 'Паша', 'Даша', 'Стас', 'Оля', 'Артём', 'Кира',
  'Егор', 'Соня', 'Лев', 'Вера',
]
const MISSION_POOL = [
  { id: 'solve3', goal: 3, bonusXp: 20 },
  { id: 'solve5', goal: 5, bonusXp: 30 },
  { id: 'nohint2', goal: 2, bonusXp: 15 },
  { id: 'perfect2', goal: 2, bonusXp: 20 },
  { id: 'perfect3', goal: 3, bonusXp: 25 },
  { id: 'xp100', goal: 100, bonusXp: 15 },
]

const hashStr = (s) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}
function mulberry32(seed) {
  let s = seed | 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function leagueBots(weekKey) {
  const rand = mulberry32(hashStr(weekKey) || 1)
  const names = [...BOT_NAMES]
  for (let i = names.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[names[i], names[j]] = [names[j], names[i]]
  }
  return names.slice(0, 10).map((name) => ({ name, pace: 25 + Math.floor(rand() * 9) * 14 })).sort((a, b) => b.pace - a.pace)
}

function missionsForDate(dateKey) {
  const rand = mulberry32(hashStr(dateKey) || 1)
  const pool = [...MISSION_POOL]
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, 3)
}

let bad = 0
for (let w = 1; w <= 52; w++) {
  for (const y of [2024, 2025, 2026, 2027]) {
    const wk = `${y}-W${String(w).padStart(2, '0')}`
    const bots = leagueBots(wk)
    if (bots.length !== 10 || new Set(bots.map((b) => b.name)).size !== 10) { console.log('ПЛОХО:', wk); bad++ }
  }
}
for (let d = 1; d <= 28; d++) {
  for (const m of ['01', '02', '03', '11', '12']) {
    const dk = `2026-${m}-${String(d).padStart(2, '0')}`
    const ms = missionsForDate(dk)
    if (ms.length !== 3 || new Set(ms.map((m2) => m2.id)).size !== 3) { console.log('ПЛОХО:', dk); bad++ }
  }
}
console.log(bad === 0 ? 'ВСЕ 208 недель и 140 дат: 10 уникальных ботов / 3 уникальные миссии — циклов нет' : `${bad} проблем`)
console.log('Пример 2026-W34:', leagueBots('2026-W34').map((b) => `${b.name}:${b.pace}`).join(', '))
