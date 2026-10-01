// Пересоздание админ-аккаунта: старый удалить, новый создать (role=admin)
import fs from 'node:fs'

const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = 'skqwdxufsufmtnpaixnj'
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

const NEW_EMAIL = 'admin@m8chess.com'
const NEW_PASSWORD = process.env.ADMIN_PASSWORD
const OLD_EMAIL = 'admin@m8-app.com'

// service_role
const keys = await fetch(`https://api.supabase.com/v1/projects/${ref}/api-keys`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
const serviceKey = (keys.find(k => (k.name || '').toLowerCase().includes('service'))?.api_key
  ?? keys.find(k => (k.name || '').toLowerCase().includes('secret'))?.api_key)
if (!serviceKey) { console.error('нет service_role'); process.exit(1) }

const mgmtQuery = async (sql) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: H, body: JSON.stringify({ query: sql }),
  })
  return { status: r.status, body: await r.text() }
}

// 1. Найти и удалить старого админа
const oldId = await mgmtQuery(`select id from auth.users where email = '${OLD_EMAIL}'`)
const oldIdStr = (oldId.body.match(/"id":"([a-f0-9-]+)"/) || [])[1]
if (oldIdStr) {
  const del = await fetch(`https://${ref}.supabase.co/auth/v1/admin/users/${oldIdStr}`, {
    method: 'DELETE',
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  })
  console.log('старый админ удалён:', del.status === 204 ? 'ok' : del.status)
} else {
  console.log('старый админ не найден в auth.users')
}

// 2. Новый админ (сразу подтверждён)
const create = await fetch(`https://${ref}.supabase.co/auth/v1/admin/users`, {
  method: 'POST',
  headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: NEW_EMAIL, password: NEW_PASSWORD, email_confirm: true, user_metadata: { username: 'admin' } }),
})
const created = await create.json()
if (!create.ok) { console.error('ошибка создания:', create.status, JSON.stringify(created)); process.exit(1) }
console.log('новый админ создан:', created.id)

// 3. Роль admin (триггер мог создать профиль — upsert)
const role = await mgmtQuery(`insert into public.profiles (id, username, role) values ('${created.id}', 'admin', 'admin') on conflict (id) do update set role = 'admin'`)
console.log('роль admin:', role.status === 200 ? 'назначена' : role.body)

console.log('\n=== НОВЫЙ АДМИН ===')
console.log('Email:', NEW_EMAIL)
console.log('Пароль:', NEW_PASSWORD)
