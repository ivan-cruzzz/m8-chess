// Проверка check-payment по реальному счёту
import fs from 'node:fs'
const ref = 'skqwdxufsufmtnpaixnj'
const url = `https://${ref}.supabase.co`
const ANON = fs.readFileSync('.env', 'utf8').match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1]
const inv = JSON.parse(fs.readFileSync('.npw-test-invoice.json', 'utf8'))

const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@m8chess.com', password: process.env.ADMIN_PASSWORD }),
})
const { access_token } = await login.json()

const r = await fetch(`${url}/functions/v1/check-payment`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${access_token}`, apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ invoice_id: inv.invoice_id }),
})
console.log('check-payment:', r.status)
console.log(await r.text())
