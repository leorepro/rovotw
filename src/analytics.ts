// GA4 事件追蹤：section 曝光 / section 停留時間 / Vimeo 影片播放
//
// 分工：YouTube 影片、外連點擊、捲動深度由 GA4「加強型評估」自動處理，
// 這裡只補 GA 沒有的三塊。詳見 docs/superpowers/specs/2026-06-23-ga-event-tracking-design.md

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    Vimeo?: { Player: new (el: Element) => VimeoPlayer }
  }
}

interface VimeoPlayer {
  on(event: 'play' | 'ended', cb: () => void): void
  on(event: 'timeupdate', cb: (data: { percent: number }) => void): void
}

// 本機或網址帶 ?ga_debug=1 時，事件同步輸出到 Console，方便測試
const DEBUG =
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1' ||
  new URLSearchParams(location.search).has('ga_debug')

function track(name: string, params: Record<string, unknown>): void {
  // 每個事件都帶上目前語言，方便在 GA4 依語言分群（名稱維持語言無關的穩定值）
  const enriched = { language: document.documentElement.lang || 'zh-TW', ...params }
  if (DEBUG) console.log(`%c[GA] ${name}`, 'color:#1a73e8;font-weight:bold', enriched)
  if (typeof window.gtag !== 'function') return
  // DEBUG 時附帶 debug_mode，讓事件出現在 GA4 DebugView
  window.gtag('event', name, DEBUG ? { ...enriched, debug_mode: true } : enriched)
}

// 取得 section 的可辨識名稱：id > 標題的 i18n key（語言無關）> 標題文字 > section-{index}
// 用 i18n key 而非標題文字，避免切換語言後同一區塊在 GA 報表被拆成多筆。
function sectionName(section: HTMLElement, index: number): string {
  if (section.id) return section.id
  const heading = section.querySelector('.section-heading, h1, h2')
  const key = heading?.getAttribute('data-i18n')
  if (key) return key
  const text = heading?.textContent?.trim()
  if (text) return text.replace(/\s+/g, ' ').slice(0, 60)
  return index >= 0 ? `section-${index}` : 'section'
}

// 元素的語言無關名稱：自身或子層的 data-i18n key 優先，否則退回可見文字
function stableName(el: Element, max = 60): string {
  const keyed = el.matches('[data-i18n]') ? el : el.querySelector('[data-i18n]')
  const key = keyed?.getAttribute('data-i18n')
  return key ?? text(el, max)
}

// 取得元素所在 section 的名稱（給點擊追蹤用，不需 index）
function sectionLabelOf(el: Element): string {
  const section = el.closest('section')
  return section ? sectionName(section as HTMLElement, -1) : ''
}

function text(el: Element | null | undefined, max = 60): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, max)
}

// ---------- section 曝光 + 停留時間 ----------
function initSectionTracking(): void {
  const sections = [...document.querySelectorAll<HTMLElement>('section')]
  if (!sections.length) return

  interface SectionState {
    name: string
    index: number
    viewed: boolean // 是否已送過 section_view
    visibleSince: number | null // 目前這段可見的起始時間戳
    dwellMs: number // 累計可見毫秒數
    flushed: boolean // 是否已送過 section_dwell
  }

  const states = new Map<Element, SectionState>()
  sections.forEach((section, index) => {
    states.set(section, {
      name: sectionName(section, index),
      index,
      viewed: false,
      visibleSince: null,
      dwellMs: 0,
      flushed: false,
    })
  })

  const io = new IntersectionObserver(
    (entries) => {
      const now = performance.now()
      for (const entry of entries) {
        const state = states.get(entry.target)
        if (!state) continue

        if (entry.isIntersecting) {
          // 首次曝光送一次 section_view
          if (!state.viewed) {
            state.viewed = true
            track('section_view', { section_name: state.name, section_index: state.index })
          }
          // 開始累計停留時間
          if (state.visibleSince === null) state.visibleSince = now
        } else if (state.visibleSince !== null) {
          // 離開畫面，累計這段可見時間
          state.dwellMs += now - state.visibleSince
          state.visibleSince = null
        }
      }
    },
    { threshold: 0.5 },
  )

  sections.forEach((section) => io.observe(section))

  // 送出所有停留過的 section（離開分頁 / 關閉頁面時呼叫，只送一次）
  const flushDwell = (): void => {
    const now = performance.now()
    states.forEach((state) => {
      if (state.flushed) return
      if (state.visibleSince !== null) {
        state.dwellMs += now - state.visibleSince
        state.visibleSince = null
      }
      const seconds = Math.round(state.dwellMs / 1000)
      if (seconds < 1) return
      state.flushed = true
      track('section_dwell', {
        section_name: state.name,
        section_index: state.index,
        dwell_seconds: seconds,
      })
    })
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushDwell()
  })
  window.addEventListener('pagehide', flushDwell)
}

// ---------- Vimeo 影片播放 ----------
// 參數名稱對齊 GA4 內建影片維度，讓 Vimeo 與 YouTube 出現在同一張報表。
function initVimeoTracking(): void {
  const iframes = [
    ...document.querySelectorAll<HTMLIFrameElement>('iframe[src*="player.vimeo.com"]'),
  ]
  if (!iframes.length) return

  // 動態載入 Vimeo Player SDK
  const script = document.createElement('script')
  script.src = 'https://player.vimeo.com/api/player.js'
  script.async = true
  script.onload = () => {
    if (!window.Vimeo) return
    iframes.forEach((iframe) => attachVimeo(iframe))
  }
  document.head.appendChild(script)
}

function attachVimeo(iframe: HTMLIFrameElement): void {
  if (!window.Vimeo) return
  const player = new window.Vimeo.Player(iframe)

  const section = iframe.closest('section')
  const baseParams = {
    video_title: iframe.title || iframe.src,
    video_provider: 'vimeo',
    video_url: iframe.src,
    video_section: section ? sectionName(section, -1) : '',
  }

  let started = false
  const milestones = [25, 50, 75]
  const sent = new Set<number>()

  player.on('play', () => {
    if (started) return
    started = true
    track('video_start', { ...baseParams })
  })

  player.on('timeupdate', (data) => {
    const percent = Math.floor(data.percent * 100)
    for (const m of milestones) {
      if (percent >= m && !sent.has(m)) {
        sent.add(m)
        track('video_progress', { ...baseParams, video_percent: m })
      }
    }
  })

  player.on('ended', () => {
    track('video_complete', { ...baseParams, video_percent: 100 })
  })
}

// ---------- 按鈕 / 連結點擊 ----------
// 用事件委派統一送 button_click，帶 button_name 讓報表能拆到每顆按鈕。
function initClickTracking(): void {
  document.addEventListener('click', (e) => {
    const el = e.target as Element | null
    if (!el) return

    // 轉換型 CTA（所有 .btn：預約Demo、與我們聯絡、訂閱、聯絡我們、課程按鈕…）
    const btn = el.closest<HTMLElement>('.btn')
    if (btn) {
      track('button_click', {
        button_name: stableName(btn) || btn.getAttribute('aria-label') || 'button',
        button_type: 'cta',
        link_url: (btn as HTMLAnchorElement).href || '',
        button_section: sectionLabelOf(btn),
      })
      return
    }

    // 活動卡片（用圖片 alt 當標題）
    const card = el.closest<HTMLElement>('.event-card')
    if (card) {
      track('button_click', {
        button_name: card.querySelector('img')?.getAttribute('alt')?.slice(0, 60) || 'event-card',
        button_type: 'event_card',
        link_url: (card as HTMLAnchorElement).href || '',
        button_section: sectionLabelOf(card),
      })
      return
    }

    // FAQ：只在「展開」時送（main.ts 已先切換 aria-expanded）
    const faq = el.closest<HTMLElement>('.faq-question')
    if (faq) {
      if (faq.getAttribute('aria-expanded') === 'true') {
        track('button_click', {
          button_name: stableName(faq, 80) || 'faq',
          button_type: 'faq',
          button_section: sectionLabelOf(faq),
        })
      }
      return
    }

    // 提示詞分頁
    const tab = el.closest<HTMLElement>('#promptTabs button')
    if (tab) {
      track('button_click', { button_name: stableName(tab) || 'tab', button_type: 'prompt_tab' })
      return
    }

    // Agent 輪播（箭頭 / 縮圖）
    const arrow = el.closest<HTMLElement>('.carousel-arrow')
    if (arrow) {
      track('button_click', {
        button_name: arrow.classList.contains('next') ? 'carousel-next' : 'carousel-prev',
        button_type: 'carousel',
      })
      return
    }
    const thumb = el.closest<HTMLElement>('.carousel-thumbs button')
    if (thumb) {
      track('button_click', {
        button_name: thumb.getAttribute('aria-label') || 'carousel-thumb',
        button_type: 'carousel',
      })
    }
  })
}

// ---------- 語言切換 ----------
// i18n 引擎在切換語言時會發出 i18n:change 事件，這裡轉成 GA 的 language_switch。
function initLanguageTracking(): void {
  document.addEventListener('i18n:change', (e) => {
    const detail = (e as CustomEvent<{ from: string; to: string }>).detail
    track('language_switch', { from_language: detail.from, to_language: detail.to })
  })
}

export function initAnalytics(): void {
  initSectionTracking()
  initVimeoTracking()
  initClickTracking()
  initLanguageTracking()
}
