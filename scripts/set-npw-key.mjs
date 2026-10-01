// Настройка ключа NOWPayments + живой тест создания счёта
import fs from 'node:fs'

const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = 'skqwdxufsufmtnpaixnj'
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const NPW_KEY = process.env.NPW_API_KEY

// 1. Секрет (проектный — виден всем функциям)
let set = await fetch(`https://api.supabase.com/v1/projects/${ref}/secrets`, {
  method: 'PUT', headers: H, body: JSON.stringify([{ name: 'NPW_API_KEY', value: NPW_KEY }]),
})
console.log('секреты PUT:', set.status)
if (set.status === 404 || set.status === 405) {
  set = await fetch(`https://api.supabase.com/v1/projects/${ref}/secrets`, {
    method: 'POST', headers: H, body: JSON.stringify([{ name: 'NPW_API_KEY', value: NPW_KEY }]),
  })
  console.log('секреты POST:', set.status)
}
const list = await fetch(`https://api.supabase.com/v1/projects/${ref}/secrets`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
console.log('секреты проекта:', JSON.stringify(list.map(s => s.name)))

// 2. Тест ключа напрямую в NOWPayments (статус API)
const api = await fetch('https://api.nowpayments.io/v1/status', { headers: { 'x-api-key': NPW_KEY } })
console.log('NOWPayments API статус:', api.status)

// 3. Логин админом → JWT
const url = `https://${ref}.supabase.co`
const ANON = fs.readFileSync('.env', 'utf8').match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1]
const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@m8chess.com', password: process.env.ADMIN_PASSWORD }),
})
const { access_token } = await login.json()
console.log('логин админа:', login.status)

// 4. Создание реального счёта через нашу функцию
const t0 = Date.now()
const inv = await fetch(`${url}/functions/v1/create-invoice`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${access_token}`, apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ plan: 'monthly' }),
})
const body = await inv.json()
console.log('create-invoice:', inv.status, '|', Date.now() - t0, 'мс')
console.log('invoice_id:', body.invoice_id, '| pay_url:', (body.pay_url ?? '').slice(0, 80))
fs.writeFileSync('.npw-test-invoice.json', JSON.stringify(body, null, 2))
