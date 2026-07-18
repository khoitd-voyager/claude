import pkg from '/Users/trandinhkhoi/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js'
const { chromium } = pkg
// Open a REAL visible Chrome window and drive it slowly so it can be watched
const browser = await chromium.launch({ headless: false, slowMo: 900, channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

await page.goto('http://localhost:8000/jp', { waitUntil: 'networkidle', timeout: 60000 })
await page.waitForTimeout(1200)

// 1) tick Amazon Japan
await page.locator('#checkbox_amazon_provider').check()
await page.waitForTimeout(1000)

// 2) type iphone
const search = page.locator('input[placeholder="ブランド名、アイテム名、商品URLをご入力ください。"]')
await search.click()
await search.type('iphone', { delay: 150 })
await page.waitForTimeout(1200)

// 3) submit
await page.keyboard.press('Enter')
await page.waitForURL('**/search**', { timeout: 20000 }).catch(()=>{})
await page.waitForLoadState('networkidle', { timeout: 30000 }).catch(()=>{})
await page.waitForTimeout(2500)

await page.screenshot({ path: '06-headed-results.png' })
console.log('FINAL_URL:', page.url())
// keep the window open a bit so the user can see it
await page.waitForTimeout(6000)
await browser.close()
