// Выполняет setup.sql в Supabase через Management API
import fs from 'node:fs'

const sql = fs.readFileSync('scripts/supabase-setup.sql', 'utf8')
const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = 'skqwdxufsufmtnpaixnj'

const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
})
const body = await r.text()
console.log('статус:', r.status)
console.log('ответ:', body.slice(0, 500) || '(пусто = успех)')
