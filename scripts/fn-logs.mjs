// Логи edge-функции
const t = process.env.SUPABASE_ACCESS_TOKEN
const r = await fetch('https://api.supabase.com/v1/projects/skqwdxufsufmtnpaixnj/functions/ai-coach/logs', {
  headers: { Authorization: `Bearer ${t}` },
})
console.log(r.status)
console.log((await r.text()).slice(0, 900))
