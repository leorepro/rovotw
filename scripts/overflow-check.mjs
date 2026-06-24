// 量測手機寬度下「真正撐大頁面」的元素（右緣超過視窗、且未被祖先裁掉）
import puppeteer from 'puppeteer-core'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const URL = process.argv[2] || 'http://localhost:5173/'
const WIDTH = Number(process.argv[3] || 390)

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
const page = await browser.newPage()
await page.setViewport({ width: WIDTH, height: 800, isMobile: true, deviceScaleFactor: 2 })
await page.goto(URL, { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 600))

const res = await page.evaluate((vw) => {
  const docW = document.documentElement.scrollWidth
  const out = []
  for (const el of document.body.querySelectorAll('*')) {
    const r = el.getBoundingClientRect()
    if (r.right > vw + 1 && r.right <= docW + 2 && r.width > 0) {
      const cs = getComputedStyle(el)
      out.push({
        sel:
          el.tagName.toLowerCase() +
          (el.id ? '#' + el.id : '') +
          (typeof el.className === 'string' && el.className
            ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
            : ''),
        left: Math.round(r.left),
        right: Math.round(r.right),
        w: Math.round(r.width),
        ws: cs.whiteSpace,
      })
    }
  }
  out.sort((a, b) => b.right - a.right || b.w - a.w)
  return { docW, vw, top: out.slice(0, 14) }
}, WIDTH)

console.log(`vw=${res.vw} docW=${res.docW} overflow=${res.docW - res.vw}px`)
for (const o of res.top) console.log(`  L=${o.left} R=${o.right} w=${o.w} ws=${o.ws}  ${o.sel}`)

await browser.close()
