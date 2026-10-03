// Проверка задеплоенного сайта: бандл содержит ключи Supabase
const base = 'https://luminous-sable-efc0e7.netlify.app'
const html = await fetch(base + '/').then(r => r.text())
const m = html.match(/assets\/index-[\w-]+\.js/)
if (!m) { console.log('index.html не отдал бандл-ссылку; начало:', html.slice(0, 200)); process.exit(1) }
const js = await (await fetch(base + '/' + m[0])).text()
console.log('бандл:', m[0])
console.log('supabase URL вшит:', js.includes('skqwdxufsufmtnpaixnj.supabase.co'))
console.log('anon-ключ вшит:', js.includes('eyJhbGciOiJIUzI1NiIs'))
