// i18n 引擎：把字典套到 DOM、記憶語言、提供切換 API
//
// 設計重點：
// - 繁中是「來源語言」，直接用頁面原始 HTML（不載入 JSON），確保預設語言永遠正確、不受翻譯字典影響。
// - 其他語言以動態 import 載入對應 JSON，僅在切換時才下載，降低首屏成本。
// - 標記方式：元素內容用 data-i18n="key"；屬性用 data-i18n-attr="attr:key;attr2:key2"。
// - 字典值是我們自己維護的可信內容（含 <strong>/<br> 等），統一以 innerHTML 套用。

import { LOCALES, DEFAULT_LOCALE, resolveLocale, isLocale, type Locale } from './locale'

export { LOCALES, DEFAULT_LOCALE, type Locale }

type Dict = Record<string, string>

const STORAGE_KEY = 'rovo_lang'

// 各語言 JSON 載入器（繁中不需要，用頁面原始內容）
const loaders: Record<Exclude<Locale, 'zh-TW'>, () => Promise<{ default: Dict }>> = {
  en: () => import('./locales/en.json'),
  ko: () => import('./locales/ko.json'),
  ja: () => import('./locales/ja.json'),
  vi: () => import('./locales/vi.json'),
}
const dictCache = new Map<Locale, Dict>()

async function loadDict(locale: Locale): Promise<Dict | null> {
  if (locale === 'zh-TW') return null
  const cached = dictCache.get(locale)
  if (cached) return cached
  const mod = await loaders[locale]()
  dictCache.set(locale, mod.default)
  return mod.default
}

// ---------- 原始（繁中）內容快照 ----------
interface Baseline {
  html: string
  attrs: Record<string, string>
}
const baselines = new WeakMap<Element, Baseline>()
let snapped = false

// "alt:hero.imgAlt;aria-label:nav.toggleAria" → [['alt','hero.imgAlt'], ...]
function parseAttrSpec(spec: string): [string, string][] {
  return spec
    .split(';')
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const i = pair.indexOf(':')
      return [pair.slice(0, i).trim(), pair.slice(i + 1).trim()] as [string, string]
    })
}

function elements(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-i18n], [data-i18n-attr]')]
}

function snapshot(): void {
  if (snapped) return
  elements().forEach((el) => {
    const base: Baseline = { html: el.innerHTML, attrs: {} }
    const spec = el.getAttribute('data-i18n-attr')
    if (spec) {
      for (const [attr] of parseAttrSpec(spec)) base.attrs[attr] = el.getAttribute(attr) ?? ''
    }
    baselines.set(el, base)
  })
  snapped = true
}

function applyToElement(el: HTMLElement, dict: Dict | null): void {
  const base = baselines.get(el)
  if (!base) return

  const key = el.getAttribute('data-i18n')
  if (key) {
    const value = dict ? (dict[key] ?? base.html) : base.html
    if (el.innerHTML !== value) el.innerHTML = value
  }

  const spec = el.getAttribute('data-i18n-attr')
  if (spec) {
    for (const [attr, attrKey] of parseAttrSpec(spec)) {
      const value = dict ? (dict[attrKey] ?? base.attrs[attr] ?? '') : (base.attrs[attr] ?? '')
      if (el.getAttribute(attr) !== value) el.setAttribute(attr, value)
    }
  }
}

// 更新 <head> 與 <html> 上的語言相關屬性（標題/描述靠 data-i18n 已處理）
function applyDocumentMeta(locale: Locale): void {
  const meta = LOCALES.find((l) => l.code === locale)!
  document.documentElement.lang = meta.htmlLang
  document.documentElement.dir = 'ltr' // 目前 5 種語言皆為 LTR
  const og = document.querySelector('meta[property="og:locale"]')
  if (og) og.setAttribute('content', meta.ogLocale)
}

// ---------- 對外狀態與 API ----------
let current: Locale = DEFAULT_LOCALE
export function getLocale(): Locale {
  return current
}

// 給 JS 動態文字（如表單狀態訊息）查當前語言的字串。
// 繁中（來源語言）沒有 JSON，直接回傳 fallback（即原本寫在程式裡的繁中文案）。
export function t(key: string, fallback = ''): string {
  if (current === DEFAULT_LOCALE) return fallback
  return dictCache.get(current)?.[key] ?? fallback
}

let applyToken = 0
export async function applyLocale(locale: Locale): Promise<void> {
  snapshot()
  const token = ++applyToken
  const dict = await loadDict(locale)
  // 載入期間若又切換了語言，放棄這次套用
  if (token !== applyToken) return
  elements().forEach((el) => applyToElement(el, dict))
  applyDocumentMeta(locale)
  current = locale
}

function persist(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    /* 無痕模式等情境忽略 */
  }
  const url = new URL(location.href)
  if (locale === DEFAULT_LOCALE) url.searchParams.delete('lang')
  else url.searchParams.set('lang', locale)
  history.replaceState(null, '', url)
}

// 切換語言：套用 + 記憶 + 廣播事件（GA 與 UI 監聽 i18n:change）
export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale) || locale === current) return
  const from = current
  await applyLocale(locale)
  persist(locale)
  document.dispatchEvent(
    new CustomEvent('i18n:change', { detail: { from, to: locale } }),
  )
}

// 啟動：依優先序決定語言並套用。回傳目前語言。
export async function initI18n(): Promise<Locale> {
  let stored: string | null = null
  try {
    stored = localStorage.getItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
  const urlLang = new URLSearchParams(location.search).get('lang')
  const locale = resolveLocale({
    urlLang,
    stored,
    navLangs: navigator.languages ?? [navigator.language],
  })
  await applyLocale(locale)
  // 把這次決定的語言寫回（含 ?lang= 正規化），讓後續一致
  if (locale !== DEFAULT_LOCALE || urlLang) persist(locale)
  return locale
}
