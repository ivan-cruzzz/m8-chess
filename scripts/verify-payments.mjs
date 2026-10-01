// Верификация запуска платёжных функций
import fs from 'node:fs'
const ref = 'skqwdxufsufmtnpaixnj'
const url = `https://${ref}.supabase.co`
const ANON = fs.readFileSync('.env', 'utf8').match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1]

const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@m8chess.com', password: process.env.ADMIN_PASSWORD }),
})
const { access_token } = await login.json()
console.log('логин админа:', login.status)

for (const fn of ['create-invoice', 'check-payment']) {
  const r = await fetch(`${url}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${access_token}`, apikey: ANON, 'Content-Type': 'application/json' },
    body: JSON.stringify(fn === 'create-invoice' ? { plan: 'monthly' } : { invoice_id: 'test' }),
  })
  const body = await r.json()
  console.log(`${fn}:`, r.status, '|', body.error ?? 'ok')
}
