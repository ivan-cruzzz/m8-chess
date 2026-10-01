// Подготовка AI-тренёра: миграция + деплой edge-функции
import fs from 'node:fs'

const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = 'skqwdxufsufmtnpaixnj'
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

// 1. Миграция (кэш + квоты)
const sql = fs.readFileSync('supabase/migrations/20260821000000_ai_coach.sql', 'utf8')
const mig = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST', headers: H, body: JSON.stringify({ query: sql }),
})
console.log('миграция:', mig.status, (await mig.text()).slice(0, 200) || '(пусто = успех)')

// 2. Деплой edge-функции ai-coach
const source = fs.readFileSync('supabase/functions/ai-coach/index.ts', 'utf8')
const dep = await fetch(`https://api.supabase.com/v1/projects/${ref}/functions`, {
  method: 'POST',
  headers: H,
  body: JSON.stringify({ slug: 'ai-coach', name: 'ai-coach', body: source, verify_jwt: true }),
})
const depText = await dep.text()
console.log('деплой:', dep.status, depText.slice(0, 300))

// Если функция уже существует — обновим (PATCH)
if (dep.status === 409 || dep.status === 422) {
  const upd = await fetch(`https://api.supabase.com/v1/projects/${ref}/functions/ai-coach`, {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify({ body: source, verify_jwt: true }),
  })
  console.log('обновление:', upd.status, (await upd.text()).slice(0, 300))
}

// 3. Проверка списка функций
const list = await fetch(`https://api.supabase.com/v1/projects/${ref}/functions`, { headers: H }).then(r => r.json())
console.log('функции:', JSON.stringify((Array.isArray(list) ? list : [list]).map(f => f.slug ?? f.name)))
