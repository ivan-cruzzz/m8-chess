// Верификация таблиц + получение API-ключей проекта
import fs from 'node:fs'

const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = 'skqwdxufsufmtnpaixnj'
const H = { Authorization: `Bearer ${token}` }
const q = async (sql) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: { ...H, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: sql }),
  })
  return { status: r.status, body: await r.text() }
}

const tables = await q("select table_name from information_schema.tables where table_schema='public' order by table_name")
console.log('таблицы public:', tables.body)

// Пользователи и их профиль/подписка (проверка триггера)
const users = await q("select id, email, email_confirmed_at is not null as confirmed, raw_user_meta_data->>'username' as username from auth.users order by created_at desc limit 5")
console.log('auth.users:', users.body)

const joined = await q("select p.username, s.plan from profiles p join subscriptions s on s.user_id = p.id order by p.created_at desc limit 5")
console.log('profiles+subscriptions:', joined.body)

const trigger = await q("select tgname from pg_trigger where tgname='on_auth_user_created'")
console.log('триггер:', trigger.body)

// API-ключи проекта
const keys = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, { headers: H }).then(r => r.json())
let anonVal = ''
for (const k of keys) {
  const val = k.api_key ?? k.key ?? ''
  console.log(`ключ [${k.name ?? k.type}]:`, val ? val.slice(0, 20) + '…' : '(пусто)')
  if ((k.name ?? '').toLowerCase().includes('anon')) anonVal = val
}

const envTxt = `VITE_SUPABASE_URL=https://${ref}.supabase.co\nVITE_SUPABASE_ANON_KEY=${anonVal}\n`
fs.writeFileSync('.env', envTxt)
console.log('.env записан: URL + anon-ключ (', anonVal.length, 'символов )')
