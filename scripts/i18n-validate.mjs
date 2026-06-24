// 驗證各語言字典與 zh-TW 來源的一致性：
// 1) key 完全相同（不缺、不多）
// 2) 每個值的 HTML 標籤結構一致（<li>/<strong>/<br>/<a>/<ul>/<ol>/<span> 數量相符）
// 用法：node scripts/i18n-validate.mjs

import { readFileSync } from 'node:fs'

const dir = new URL('../src/i18n/locales/', import.meta.url)
const load = (f) => JSON.parse(readFileSync(new URL(f, dir), 'utf8'))
const src = load('zh-TW.json')
const targets = ['en', 'ko', 'ja', 'vi']

// 只存在於翻譯檔、不在 DOM（繁中走 main.ts 的 fallback）的 key —— 表單狀態訊息
const CODE_ONLY = [
  'subscribe.status.comingSoon',
  'subscribe.status.success',
  'subscribe.status.invalid',
  'subscribe.status.error',
]

const TAGS = ['li', 'strong', 'br', 'a', 'ul', 'ol', 'span']
const count = (s, tag) => (s.match(new RegExp(`<${tag}[ >]`, 'g')) || []).length

let problems = 0
for (const t of targets) {
  const d = load(`${t}.json`)
  const srcKeys = Object.keys(src)
  const missing = [...srcKeys, ...CODE_ONLY].filter((k) => !(k in d))
  const extra = Object.keys(d).filter((k) => !(k in src) && !CODE_ONLY.includes(k))
  if (missing.length) {
    problems += missing.length
    console.error(`[${t}] 缺少 ${missing.length} 個 key：`, missing.slice(0, 10))
  }
  if (extra.length) {
    problems += extra.length
    console.error(`[${t}] 多出 ${extra.length} 個 key：`, extra.slice(0, 10))
  }
  for (const k of srcKeys) {
    if (!(k in d)) continue
    for (const tag of TAGS) {
      const a = count(src[k], tag)
      const b = count(d[k], tag)
      if (a !== b) {
        problems++
        console.error(`[${t}] ${k}：<${tag}> 數量 ${a}→${b}`)
      }
    }
  }
  console.log(`[${t}] keys=${Object.keys(d).length} ✓`)
}

if (problems) {
  console.error(`\n❌ 共 ${problems} 個問題`)
  process.exit(1)
}
console.log('\n✓ 所有語言檔 key 與 HTML 標籤結構一致')
