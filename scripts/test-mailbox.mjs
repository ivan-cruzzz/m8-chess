// Одноразовый ящик для теста регистрации
const r = await fetch('https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1')
const d = await r.json()
console.log(d[0])
