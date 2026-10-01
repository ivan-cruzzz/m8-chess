// Проверка профилей и ролей
const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = 'skqwdxufsufmtnpaixnj'
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
const q = async (sql) => {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST', headers: H, body: JSON.stringify({ query: sql }),
  })
  return r.json()
}
console.log('profiles:', JSON.stringify(await q("select id, username, role from profiles order by created_at desc limit 5")))
console.log('users:', JSON.stringify(await q("select id, email from auth.users order by created_at desc limit 5")))
