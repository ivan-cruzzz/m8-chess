// E2E-тест ai-coach: логин → JWT → вызов функции
const ref = 'skqwdxufsufmtnpaixnj'
const url = `https://${ref}.supabase.co`
const ANON = (await import('node:fs')).readFileSync('.env', 'utf8').match(/VITE_SUPABASE_ANON_KEY=(\S+)/)[1]

// 1. Логин админом
const login = await fetch(`${url}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@m8-app.com', password: process.env.ADMIN_PASSWORD }),
})
const { access_token } = await login.json()
console.log('логин:', login.status)

// 2. Вызов ai-coach (подсказка)
const t0 = Date.now()
const coach = await fetch(`${url}/functions/v1/ai-coach`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${access_token}`, apikey: ANON, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'hint',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    lang: 'ru',
  }),
})
const body = await coach.json()
console.log('ai-coach:', coach.status, '|', Date.now() - t0, 'мс | cached:', body.cached)
console.log('ответ тренёра:', JSON.stringify(body.response ?? body, null, 2).slice(0, 500))
