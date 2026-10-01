// Настройка секретов AI-тренёра (Mistral) + живой тест функции
const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = 'skqwdxufsufmtnpaixnj'
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

// 1. Секреты
const secrets = [
  { name: 'AI_PROVIDER_KEY', value: 'iCybv6GdQrUkE6l8jSZ75wPqsaLXJukU' },
  { name: 'AI_PROVIDER_URL', value: 'https://api.mistral.ai/v1' },
  { name: 'AI_MODEL', value: 'mistral-small-latest' },
]
let set = await fetch(`https://api.supabase.com/v1/projects/${ref}/functions/ai-coach/secrets`, {
  method: 'PUT', headers: H, body: JSON.stringify(secrets),
})
if (set.status === 404) {
  set = await fetch(`https://api.supabase.com/v1/projects/${ref}/secrets`, {
    method: 'POST', headers: H, body: JSON.stringify(secrets),
  })
}
console.log('секреты:', set.status, (await set.text()).slice(0, 150) || '(ok)')

// 2. Прямой тест ключа против Mistral
const t0 = Date.now()
const test = await fetch('https://api.mistral.ai/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + secrets[0].value },
  body: JSON.stringify({
    model: 'mistral-small-latest',
    max_tokens: 60,
    messages: [{ role: 'user', content: 'Ответь одним словом: работает?' }],
  }),
})
const tjson = await test.json()
console.log('Mistral прямой тест:', test.status, '| ответ:', tjson?.choices?.[0]?.message?.content?.slice(0, 50), '|', Date.now() - t0, 'мс')
if (!test.ok) console.log(JSON.stringify(tjson).slice(0, 300))
