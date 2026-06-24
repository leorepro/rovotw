// 從標記好的 index.html 萃取繁中來源字典 src/i18n/locales/zh-TW.json
// 用法：node scripts/i18n-extract.mjs
// - data-i18n="key"           → 取該元素 innerHTML
// - data-i18n-attr="attr:key" → 取該屬性值
// 同一個 key 在多處出現時，值必須一致，否則報錯（避免翻譯歧義）。

import { readFileSync, writeFileSync } from 'node:fs'
import { JSDOM } from 'jsdom'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')
const { document } = new JSDOM(html).window

const dict = {}
const conflicts = []

function put(key, value) {
  const v = value.trim()
  if (key in dict && dict[key] !== v) {
    conflicts.push({ key, a: dict[key], b: v })
    return
  }
  dict[key] = v
}

for (const el of document.querySelectorAll('[data-i18n]')) {
  put(el.getAttribute('data-i18n'), el.innerHTML)
}
for (const el of document.querySelectorAll('[data-i18n-attr]')) {
  for (const pair of el.getAttribute('data-i18n-attr').split(';')) {
    const t = pair.trim()
    if (!t) continue
    const i = t.indexOf(':')
    const attr = t.slice(0, i).trim()
    const key = t.slice(i + 1).trim()
    put(key, el.getAttribute(attr) ?? '')
  }
}

if (conflicts.length) {
  console.error('❌ key 值衝突（同 key 不同內容）：')
  for (const c of conflicts) console.error(`  - ${c.key}\n    A: ${c.a}\n    B: ${c.b}`)
  process.exit(1)
}

// 依 key 排序輸出，方便 diff 與校稿
const sorted = Object.fromEntries(Object.keys(dict).sort().map((k) => [k, dict[k]]))
const out = new URL('../src/i18n/locales/zh-TW.json', import.meta.url)
writeFileSync(out, JSON.stringify(sorted, null, 2) + '\n', 'utf8')
console.log(`✓ 萃取 ${Object.keys(sorted).length} 個 key → src/i18n/locales/zh-TW.json`)
