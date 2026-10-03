// Netlify: диагностика 401 (Edge Access) через API
import fs from 'node:fs'
const nfTokenPath = process.env.USERPROFILE + '\\AppData\\Roaming\\netlify\\config.json'
let tok = ''
try {
  const cfg = JSON.parse(fs.readFileSync(nfTokenPath, 'utf8'))
  const users = cfg.users ?? {}
  tok = users[Object.keys(users)[0]]?.auth?.token ?? ''
} catch {}
if (!tok) { console.log('нет токена netlify в', nfTokenPath); process.exit(1) }
console.log('токен найден')

const siteId = 'a90c0f9c-79e8-4d2e-a9d3-249bdd887012'
const site = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}`, { headers: { Authorization: `Bearer ${tok}` } }).then(r => r.json())
console.log('сайт:', site.name, '| ssl:', site.ssl_url)

const edge = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/edge-access`, { headers: { Authorization: `Bearer ${tok}` } })
console.log('edge-access:', edge.status, (await edge.text()).slice(0, 300))
