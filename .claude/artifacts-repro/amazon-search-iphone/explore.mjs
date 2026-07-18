import pkg from '/Users/trandinhkhoi/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.js'
const { chromium } = pkg
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message))
await page.goto('http://localhost:8000/jp', { waitUntil: 'networkidle', timeout: 60000 })
await page.screenshot({ path: '01-home.png', fullPage: false })
// Find inputs
const inputs = await page.$$eval('input', els => els.map(e => ({ type: e.type, name: e.name, placeholder: e.placeholder, id: e.id })))
// Find anything mentioning amazon / provider
const providerText = await page.evaluate(() => {
  const hits = []
  document.querySelectorAll('*').forEach(el => {
    const t = (el.getAttribute && (el.getAttribute('placeholder') || el.getAttribute('aria-label') || '')) || ''
    if (/amazon|provider|nguồn|プロバイダ/i.test(t)) hits.push({ tag: el.tagName, txt: t })
  })
  return hits.slice(0, 20)
})
console.log('URL:', page.url())
console.log('INPUTS:', JSON.stringify(inputs, null, 2))
console.log('PROVIDER_HINTS:', JSON.stringify(providerText, null, 2))
console.log('ERRORS:', JSON.stringify(errors, null, 2))
await browser.close()
