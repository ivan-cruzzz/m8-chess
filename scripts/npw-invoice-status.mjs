// Прямой запрос статуса счёта в NOWPayments
import fs from 'node:fs'
const inv = JSON.parse(fs.readFileSync('.npw-test-invoice.json', 'utf8'))
const key = process.env.NPW_API_KEY

const r = await fetch(`https://api.nowpayments.io/v1/payment/?invoiceId=${inv.invoice_id}`, { headers: { 'x-api-key': key } })
console.log('payment list:', r.status)
console.log((await r.text()).slice(0, 500))
