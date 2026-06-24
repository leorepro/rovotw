// 語言定義與「決定要顯示哪個語言」的純函式（與 DOM 無關，方便測試）

export const LOCALES = [
  { code: 'zh-TW', native: '繁體中文', ogLocale: 'zh_TW', htmlLang: 'zh-TW' },
  { code: 'en', native: 'English', ogLocale: 'en_US', htmlLang: 'en' },
  { code: 'ko', native: '한국어', ogLocale: 'ko_KR', htmlLang: 'ko' },
  { code: 'ja', native: '日本語', ogLocale: 'ja_JP', htmlLang: 'ja' },
  { code: 'vi', native: 'Tiếng Việt', ogLocale: 'vi_VN', htmlLang: 'vi' },
] as const

export type Locale = (typeof LOCALES)[number]['code']

export const DEFAULT_LOCALE: Locale = 'zh-TW'

const CODES = LOCALES.map((l) => l.code) as readonly Locale[]

export function isLocale(value: string | null | undefined): value is Locale {
  return value != null && (CODES as readonly string[]).includes(value)
}

// 把瀏覽器語言標籤（如 'en-US'、'zh-Hant'、'zh'）對應到支援的語言
function matchNavLang(tag: string): Locale | null {
  const lower = tag.toLowerCase()
  // 中文一律回繁中（這個站的中文只提供繁體）
  if (lower.startsWith('zh')) return 'zh-TW'
  const prefix = lower.split('-')[0]
  const hit = CODES.find((c) => c.toLowerCase().split('-')[0] === prefix)
  return hit ?? null
}

// 決定語言的優先序：?lang= 網址參數 > localStorage 記憶 > 瀏覽器語言 > 預設繁中
export function resolveLocale(input: {
  urlLang?: string | null
  stored?: string | null
  navLangs?: readonly string[]
}): Locale {
  const { urlLang, stored, navLangs = [] } = input
  if (isLocale(urlLang)) return urlLang
  if (isLocale(stored)) return stored
  for (const tag of navLangs) {
    const matched = matchNavLang(tag)
    if (matched) return matched
  }
  return DEFAULT_LOCALE
}
