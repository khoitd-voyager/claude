import pkg from '/Users/trandinhkhoi/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js'
const { chromium } = pkg
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
const bad = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
page.on('response', async r => { if (r.status() >= 400) { let body=''; try { body = (await r.text()).slice(0,300) } catch(e){}; bad.push({ st: r.status(), m: r.request().method(), url: r.url(), body }) } })

await page.goto('http://localhost:8000/jp', { waitUntil: 'networkidle', timeout: 60000 })
await page.locator('#checkbox_amazon_provider').check()
const search = page.locator('input[placeholder="ブランド名、アイテム名、商品URLをご入力ください。"]')
await search.click()
await search.fill('iphone')
await page.waitForTimeout(800)
// Click the blue search button (submit)
const btn = page.locator('button:has(img[alt]), button:has(svg)').first()
// More robust: the search button is next to the input; find button following input
await page.keyboard.press('Enter')
await page.waitForTimeout(1500)
console.log('AFTER_ENTER_URL:', page.url())
// If still on /jp, try clicking search icon button
if (!/\/search/.test(page.url())) {
  // find the magnifier button
  const clicked = await page.evaluate(() => {
    const inp = document.querySelector('input[placeholder="ブランド名、アイテム名、商品URLをご入力ください。"]')
    if (!inp) return 'no-input'
    // walk up to a common container and find a button
    let c = inp.closest('form') || inp.parentElement.parentElement.parentElement
    const b = c && c.querySelector('button')
    if (b) { b.click(); return 'clicked:'+b.outerHTML.slice(0,120) }
    return 'no-button'
  })
  console.log('BTN_CLICK:', clicked)
  await page.waitForTimeout(2500)
}
await page.screenshot({ path: '05-after-submit.png' })
console.log('FINAL_URL:', page.url())
const snip = await page.evaluate(() => document.body.innerText.slice(0,300))
console.log('FINAL_SNIPPET:', JSON.stringify(snip))
console.log('BAD_RESPONSES:', JSON.stringify(bad, null, 2))
console.log('CONSOLE_ERRORS:', JSON.stringify(errors, null, 2))
await browser.close()
