import { describe, it, expect } from 'vitest'
import { resolveLocale, isLocale, DEFAULT_LOCALE } from './locale'

describe('isLocale', () => {
  it('接受支援的語言碼', () => {
    expect(isLocale('zh-TW')).toBe(true)
    expect(isLocale('en')).toBe(true)
    expect(isLocale('vi')).toBe(true)
  })
  it('拒絕不支援或空值', () => {
    expect(isLocale('fr')).toBe(false)
    expect(isLocale('')).toBe(false)
    expect(isLocale(null)).toBe(false)
    expect(isLocale(undefined)).toBe(false)
  })
})

describe('resolveLocale 優先序', () => {
  it('?lang= 合法時最優先', () => {
    expect(
      resolveLocale({ urlLang: 'ko', stored: 'en', navLangs: ['ja'] }),
    ).toBe('ko')
  })

  it('?lang= 不合法時忽略，往下用 localStorage', () => {
    expect(
      resolveLocale({ urlLang: 'xx', stored: 'en', navLangs: ['ja'] }),
    ).toBe('en')
  })

  it('沒有 url 時用 localStorage', () => {
    expect(resolveLocale({ stored: 'ja', navLangs: ['en'] })).toBe('ja')
  })

  it('沒有 url/stored 時用瀏覽器語言（取前綴）', () => {
    expect(resolveLocale({ navLangs: ['en-US', 'ko'] })).toBe('en')
    expect(resolveLocale({ navLangs: ['vi-VN'] })).toBe('vi')
  })

  it('中文各變體一律回繁中', () => {
    expect(resolveLocale({ navLangs: ['zh-CN'] })).toBe('zh-TW')
    expect(resolveLocale({ navLangs: ['zh-Hant-TW'] })).toBe('zh-TW')
    expect(resolveLocale({ navLangs: ['zh'] })).toBe('zh-TW')
  })

  it('瀏覽器語言都不支援時回退預設', () => {
    expect(resolveLocale({ navLangs: ['fr', 'de'] })).toBe(DEFAULT_LOCALE)
  })

  it('完全沒有輸入時回退預設', () => {
    expect(resolveLocale({})).toBe(DEFAULT_LOCALE)
  })

  it('跳過不支援的瀏覽器語言，採用第一個支援的', () => {
    expect(resolveLocale({ navLangs: ['fr', 'ja-JP', 'en'] })).toBe('ja')
  })
})
