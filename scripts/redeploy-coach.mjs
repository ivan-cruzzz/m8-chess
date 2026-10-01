// Передеплой ai-coach с jsr-импортом + E2E-тест
import fs from 'node:fs'

const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = 'skqwdxufsufmtnpaixnj'
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

let source = fs.readFileSync('supabase/functions/ai-coach/standalone.ts', 'utf8')
console.log('standalone-версия:', source.includes('Deno.serve') && !source.includes('esm.sh') ? 'ок (без импортов)' : 'ошибка')

const upd = await fetch(`https://api.supabase.com/v1/projects/${ref}/functions/ai-coach`, {
  method: 'PATCH', headers: H, body: JSON.stringify({ body: source, verify_jwt: true }),
})
console.log('передеплой:', upd.status, (await upd.text()).slice(0, 200))

// Ждём подхват новой версии + E2E
await new Promise(r => setTimeout(r, 15000))
const url = `https://${ref}.supabase.co`
const ANON = fs.readFileSync('.env', 'utf8').match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1]
const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@m8-app.com', password: process.env.ADMIN_PASSWORD }),
})
const { access_token } = await login.json()
const t0 = Date.now()
const coach = await fetch(`${url}/functions/v1/ai-coach`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${access_token}`, apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'hint', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', lang: 'ru' }),
})
const body = await coach.json()
console.log('ai-coach:', coach.status, '|', Date.now() - t0, 'мс')
console.log('ответ:', JSON.stringify(body.response ?? body, null, 2).slice(0, 500))
