// Создание админского аккаунта M8
// node scripts/create-admin.mjs [email] [password]
import fs from 'node:fs'

const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = 'skqwdxufsufmtnpaixnj'
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

const email = process.argv[2] || 'admin@m8-app.com'
const password = process.argv[3] || process.env.ADMIN_PASSWORD

// 1. service_role ключ (полный)
const keys = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
const serviceKey = (keys.find(k => (k.name || '').toLowerCase().includes('service'))?.api_key
  ?? keys.find(k => (k.name || '').toLowerCase().includes('secret'))?.api_key)
if (!serviceKey) { console.error('service_role не найден'); process.exit(1) }

// 2. Колонка role в profiles
const mgmtQuery = async (sql) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: H, body: JSON.stringify({ query: sql }),
  })
  return { status: r.status, body: await r.text() }
}
const col = await mgmtQuery("alter table public.profiles add column if not exists role text not null default 'user'")
console.log('колонка role:', col.status === 200 ? 'готова' : col.body)

// 3. Создание пользователя (Admin Auth API, сразу подтверждён)
const create = await fetch(`https://${ref}.supabase.co/auth/v1/admin/users`, {
  method: 'POST',
  headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { username: 'admin' } }),
})
const created = await create.json()
if (!create.ok) {
  console.error('ошибка создания:', create.status, JSON.stringify(created))
  process.exit(1)
}
const uid = created.id
console.log('пользователь создан:', uid)

// 4. Роль admin
const role = await mgmtQuery(`insert into public.profiles (id, username, role) values ('${uid}', 'admin', 'admin') on conflict (id) do update set role = 'admin'`)
console.log('роль admin:', role.status === 200 ? 'назначена' : role.body)

console.log('\n=== АДМИНСКИЙ АККАУНТ ===')
console.log('Email:', email)
console.log('Пароль:', password)
console.log('(сохраните пароль в менеджере паролей)')
