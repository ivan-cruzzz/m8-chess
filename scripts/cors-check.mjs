// Диагностика CORS + прямой вызов функции
const ref = 'skqwdxufsufmtnpaixnj'
const url = `https://${ref}.supabase.co/functions/v1/ai-coach`

// 1. Preflight
const opt = await fetch(url, {
  method: 'OPTIONS',
  headers: {
    Origin: 'http://127.0.0.1:7300',
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'authorization, apikey, content-type',
  },
})
console.log('OPTIONS:', opt.status)
console.log('  allow-origin:', opt.headers.get('access-control-allow-origin'))
console.log('  allow-headers:', opt.headers.get('access-control-allow-headers'))

// 2. POST с Origin (как браузер)
import fs from 'node:fs'
const ANON = fs.readFileSync('.env', 'utf8').match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1]
const login = await fetch(`https://${ref}.supabase.co/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@m8-app.com', password: process.env.ADMIN_PASSWORD }),
})
const { access_token } = await login.json()
const post = await fetch(url, {
  method: 'POST',
  headers: {
    Origin: 'http://127.0.0.1:7300',
    Authorization: `Bearer ${access_token}`,
    apikey: ANON,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ action: 'explain', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', san: 'a4', correctSan: 'Nf3', lang: 'ru' }),
})
console.log('POST с Origin:', post.status, '| allow-origin:', post.headers.get('access-control-allow-origin'))
console.log((await post.text()).slice(0, 300))
