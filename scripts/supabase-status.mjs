// Статус проекта и повтор SQL
const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = 'skqwdxufsufmtnpaixnj'
const H = { Authorization: `Bearer ${token}` }

const p = await fetch(`https://api.supabase.com/v1/projects/${ref}`, { headers: H }).then(r => r.json())
console.log('проект:', p.name, '| статус:', p.status, '| регион:', p.region)

const mode = process.argv[2] || 'status'
if (mode === 'restore') {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/restore`, { method: 'POST', headers: H })
  console.log('restore:', r.status, await r.text().then(t => t || '(принято)'))
}
if (mode === 'sql') {
  const fs = await import('node:fs')
  const sql = fs.readFileSync('scripts/supabase-setup.sql', 'utf8')
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  })
  const body = await r.text()
  console.log('SQL статус:', r.status, '| ответ:', body.slice(0, 300) || '(пусто = успех)')
}
