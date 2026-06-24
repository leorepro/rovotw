// @vitest-environment jsdom
// 整合測試：載入真正的 index.html 與語言檔，驗證引擎確實切換 DOM 文字與 meta
import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import en from './locales/en.json'
import ja from './locales/ja.json'

const htmlPath = resolve(process.cwd(), 'index.html')

beforeAll(() => {
  const html = readFileSync(htmlPath, 'utf8')
  const inner = html.slice(html.indexOf('<html'), html.indexOf('</html>') + 7)
  // 取 <html> 內層塞進 jsdom 文件
  const body = inner.replace(/^<html[^>]*>/, '').replace(/<\/html>$/, '')
  document.documentElement.innerHTML = body
})

describe('applyLocale 實際換字', () => {
  it('套用 en 後文字、<html lang>、og:locale 都更新；切回 zh-TW 還原', async () => {
    const { applyLocale, getLocale } = await import('./index')

    const cta = document.querySelector('[data-i18n="nav.cta"]')!
    const zhText = cta.textContent
    expect(zhText).toBe('預約Demo')

    await applyLocale('en')
    expect(getLocale()).toBe('en')
    expect(cta.textContent).toBe(en['nav.cta'])
    expect(cta.textContent).not.toBe(zhText)
    expect(document.documentElement.lang).toBe('en')
    expect(
      document.querySelector('meta[property="og:locale"]')!.getAttribute('content'),
    ).toBe('en_US')
    // 屬性翻譯（placeholder）也要換
    expect(document.getElementById('sub-email')!.getAttribute('placeholder')).toBe(
      en['subscribe.emailPlaceholder'],
    )
    // 含 HTML 的值用 innerHTML 套用，標籤保留
    expect(document.querySelector('[data-i18n="hero.tagline"]')!.innerHTML).toContain('<br>')

    await applyLocale('ja')
    expect(cta.textContent).toBe(ja['nav.cta'])
    expect(document.documentElement.lang).toBe('ja')

    await applyLocale('zh-TW')
    expect(getLocale()).toBe('zh-TW')
    expect(cta.textContent).toBe(zhText)
    expect(document.documentElement.lang).toBe('zh-TW')
    expect(
      document.querySelector('meta[property="og:locale"]')!.getAttribute('content'),
    ).toBe('zh_TW')
  })
})
