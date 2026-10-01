// RLS-диагностика: запрос профиля с JWT админа (как делает приложение)
import fs from 'node:fs'
const ref = 'skqwdxufsufmtnpaixnj'
const url = `https://${ref}.supabase.co`
const ANON = fs.readFileSync('.env', 'utf8').match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1]

const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@m8chess.com', password: process.env.ADMIN_PASSWORD }),
})
const { access_token, user } = await login.json()
console.log('логин:', login.status, '| uid:', user.id)

const r = await fetch(`${url}/rest/v1/profiles?select=role&id=eq.${user.id}`, {
  headers: { apikey: ANON, Authorization: `Bearer ${access_token}` },
})
console.log('RLS-запрос:', r.status, '| тело:', await r.text())
