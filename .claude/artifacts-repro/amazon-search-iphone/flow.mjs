import pkg from '/Users/trandinhkhoi/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js'
const { chromium } = pkg
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
const reqs = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
page.on('response', r => { const u = r.url(); if (/search|product|amazon|api/i.test(u)) reqs.push(r.request().method() + ' ' + r.status() + ' ' + u) })

await page.goto('http://localhost:8000/jp', { waitUntil: 'networkidle', timeout: 60000 })

// Step 1: select Amazon provider checkbox
const amazon = page.locator('#checkbox_amazon_provider')
await amazon.check()
await page.screenshot({ path: '02-amazon-checked.png' })
const isChecked = await amazon.isChecked()

// Step 2: type iphone in search box
const search = page.locator('input[placeholder="ブランド名、アイテム名、商品URLをご入力ください。"]')
await search.click()
await search.fill('iphone')
await page.screenshot({ path: '03-typed-iphone.png' })

// Step 3: submit search (press Enter)
await search.press('Enter')
await page.waitForLoadState('networkidle', { timeout: 60000 }).catch(()=>{})
await page.waitForTimeout(2500)
await page.screenshot({ path: '04-results.png', fullPage: false })

console.log('AMAZON_CHECKED:', isChecked)
console.log('RESULT_URL:', page.url())
console.log('RESULT_TITLE:', await page.title())
// count result cards heuristically
const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 400))
console.log('BODY_SNIPPET:', JSON.stringify(bodyText))
console.log('NET:', JSON.stringify(reqs.slice(0, 40), null, 2))
console.log('ERRORS:', JSON.stringify(errors, null, 2))
await browser.close()
