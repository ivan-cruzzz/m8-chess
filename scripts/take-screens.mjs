// Скриншоты всех экранов приложения через playwright
// Запуск: node scripts/take-screens.mjs
import { chromium } from 'playwright';
import fs from 'node:fs'

const dir = 'docs/screens'
fs.mkdirSync(dir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 420, height: 850 } })

await page.goto('http://127.0.0.1:7300/')
await page.waitForLoadState('networkidle')
await page.waitForTimeout(2500)

// 1. Карта уроков
await page.screenshot({ path: `${dir}/01-map.png` })
console.log('01-map')

// 2. Тропинка урока
await page.locator('main button[aria-label="Мат в 1"]').click({ force: true })
await page.waitForTimeout(1200)
await page.screenshot({ path: `${dir}/02-lesson-path.png` })
console.log('02-lesson-path')

// 3. Задача
await page.locator('button[aria-label="Мат в 1 — 1"]').click({ force: true })
await page.waitForTimeout(1800)
await page.screenshot({ path: `${dir}/03-puzzle.png` })
console.log('03-puzzle')

// 4. Игра против ИИ
await page.goto('http://127.0.0.1:7300/')
await page.waitForTimeout(1500)
await page.locator('nav button', { hasText: 'Играть' }).click()
await page.waitForTimeout(800)
await page.locator('main button', { hasText: 'Новая партия' }).click()
await page.waitForTimeout(1500)
await page.screenshot({ path: `${dir}/04-play-ai.png` })
console.log('04-play-ai')

// 5. Миссии
await page.locator('nav button', { hasText: 'Миссии' }).click()
await page.waitForTimeout(1000)
await page.screenshot({ path: `${dir}/05-daily.png` })
console.log('05-daily')

// 6. Профиль
await page.locator('nav button', { hasText: 'Профиль' }).click()
await page.waitForTimeout(1000)
await page.screenshot({ path: `${dir}/06-profile.png` })
console.log('06-profile')

// 7. Премиум
await page.locator('button[aria-label*="Premium"], button[aria-label*="M8 Premium"]').first().click()
await page.waitForTimeout(1200)
await page.screenshot({ path: `${dir}/07-premium.png` })
console.log('07-premium')

// 8. Настройки
await page.locator('button[aria-label="Настройки"], button[aria-label="Settings"]').first().click()
await page.waitForTimeout(800)
await page.screenshot({ path: `${dir}/08-settings.png` })
console.log('08-settings')

await browser.close()
console.log('ВСЕ СКРИНШОТЫ ГОТОВЫ:', dir)
