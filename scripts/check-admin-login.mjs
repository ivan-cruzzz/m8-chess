// Проверка админ-аккаунта: есть ли в базе и проходит ли парольный вход
// Требуется: SUPABASE_ACCESS_TOKEN и ADMIN_PASSWORD в переменных окружения
// (пароль панели нигде не хранится в репозитории — только хеш на устройстве админа)
const token = process.env.SUPABASE_ACCESS_TOKEN
if (!token) { console.error('Нет SUPABASE_ACCESS_TOKEN в окружении'); process.exit(1) }
const password = process.env.ADMIN_PASSWORD
if (!password) { console.error('Нет ADMIN_PASSWORD в окружении'); process.exit(1) }
const ref = 'skqwdxufsufmtnpaixnj'
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

const users = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST', headers: H,
  body: JSON.stringify({ query: "select u.email, p.role from auth.users u left join profiles p on p.id = u.id where p.role = 'admin'" }),
}).then(r => r.json())
console.log('админы в базе:', JSON.stringify(users))

// проверка входа
const ANON = (await import('node:fs')).readFileSync('.env', 'utf8').match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1]
const email = process.env.ADMIN_EMAIL ?? 'admin@m8chess.com'
const login = await fetch(`https://${ref}.supabase.co/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
console.log('проверка входа:', login.status === 200 ? 'успешно' : 'НЕ удался (' + login.status + ')')
