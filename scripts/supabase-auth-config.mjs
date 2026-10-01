// Управление конфигом аутентификации Supabase
// node scripts/supabase-auth-config.mjs get|autoconfirm-on|autoconfirm-off
const token = process.env.SUPABASE_ACCESS_TOKEN
const ref = 'skqwdxufsufmtnpaixnj'
const H = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }

const mode = process.argv[2] || 'get'

if (mode === 'get') {
  const cfg = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, { headers: H }).then(r => r.json())
  console.log('mailer_autoconfirm:', cfg.mailer_autoconfirm, '| site_url:', cfg.site_url)
} else if (mode === 'autoconfirm-on') {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ mailer_autoconfirm: true }),
  })
  console.log('autoconfirm on:', r.status)
} else if (mode === 'autoconfirm-off') {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
    method: 'PATCH', headers: H, body: JSON.stringify({ mailer_autoconfirm: false }),
  })
  console.log('autoconfirm off:', r.status)
}
