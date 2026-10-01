// Деплой платёжных edge-функций (standalone, без импортов)
import fs from 'node:fs'

const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = 'skqwdxufsufmtnpaixnj'
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

async function deploy(slug, file) {
  const body = fs.readFileSync(file, 'utf8')
  const create = await fetch(`https://api.supabase.com/v1/projects/${ref}/functions`, {
    method: 'POST', headers: H, body: JSON.stringify({ slug, name: slug, body, verify_jwt: true }),
  })
  if (create.status === 201) {
    console.log(`${slug}: деплой 201 (создана)`)
    return
  }
  const upd = await fetch(`https://api.supabase.com/v1/projects/${ref}/functions/${slug}`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ body, verify_jwt: true }),
  })
  console.log(`${slug}: обновление ${upd.status}`, (await upd.text()).slice(0, 150))
}

await deploy('create-invoice', 'supabase/functions/create-invoice/standalone.ts')
await deploy('check-payment', 'supabase/functions/check-payment/standalone.ts')

const list = await fetch(`https://api.supabase.com/v1/projects/${ref}/functions`, { headers: H }).then(r => r.json())
console.log('все функции:', JSON.stringify(list.map(f => `${f.slug}(${f.status})`)))
