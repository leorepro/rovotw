// 互動行為：FAQ 手風琴、Rovo Agent 輪播、活動卡片捲動指示點、表單（僅外觀）

// ---------- FAQ 手風琴 ----------
function initFaq(): void {
  document.querySelectorAll<HTMLElement>('.faq-item').forEach((item) => {
    const btn = item.querySelector<HTMLButtonElement>('.faq-question')
    btn?.addEventListener('click', () => {
      const open = item.classList.toggle('open')
      btn.setAttribute('aria-expanded', String(open))
    })
  })
}

// ---------- Rovo Agent 輪播 ----------
function initCarousel(): void {
  const root = document.getElementById('agentCarousel')
  if (!root) return

  const track = root.querySelector<HTMLElement>('.carousel-track')!
  const slides = root.querySelectorAll('.carousel-slide')
  const thumbs = [...root.querySelectorAll<HTMLButtonElement>('.carousel-thumbs button')]
  const caption = root.querySelector<HTMLElement>('.carousel-caption')!
  const total = slides.length
  let index = 0

  const render = (): void => {
    track.style.transform = `translateX(-${index * 100}%)`
    caption.textContent = `${index + 1}/${total}`
    thumbs.forEach((t, i) => t.classList.toggle('active', i === index))
  }

  const go = (delta: number): void => {
    index = (index + delta + total) % total
    render()
  }

  root.querySelector('.carousel-arrow.prev')?.addEventListener('click', () => go(-1))
  root.querySelector('.carousel-arrow.next')?.addEventListener('click', () => go(1))
  thumbs.forEach((t, i) =>
    t.addEventListener('click', () => {
      index = i
      render()
    }),
  )
}

// ---------- 活動卡片捲動指示點 ----------
function initEventsDots(): void {
  const track = document.getElementById('eventsTrack')
  const dotsBox = document.getElementById('eventsDots')
  if (!track || !dotsBox) return

  const pages = (): number =>
    Math.max(1, Math.ceil((track.scrollWidth - track.clientWidth) / track.clientWidth) + 1)

  const rebuild = (): void => {
    dotsBox.innerHTML = ''
    for (let i = 0; i < pages(); i++) {
      const dot = document.createElement('button')
      dot.type = 'button'
      dot.setAttribute('aria-label', `第 ${i + 1} 頁`)
      dot.addEventListener('click', () => {
        track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' })
      })
      dotsBox.appendChild(dot)
    }
    update()
  }

  const update = (): void => {
    const page = Math.round(track.scrollLeft / track.clientWidth)
    dotsBox.querySelectorAll('button').forEach((d, i) => d.classList.toggle('active', i === page))
  }

  track.addEventListener('scroll', update, { passive: true })
  window.addEventListener('resize', rebuild)
  rebuild()
}

// ---------- 聯絡表單（FormSubmit.co → sales@titansoft.com.sg） ----------
function initContactForm(): void {
  const form = document.getElementById('contactForm') as HTMLFormElement | null
  if (!form) return

  // 送出後 FormSubmit 會轉址回來；_next 必須是絕對網址，依目前主機動態組出
  const next = document.getElementById('formNext') as HTMLInputElement | null
  if (next) {
    next.value = `${location.origin}${location.pathname}?sent=1#contact`
  }

  // 附加檔案：點「附加檔案」開檔案選擇器，更新附件數
  const file = document.getElementById('cf-file') as HTMLInputElement | null
  const count = document.getElementById('attachCount')
  file?.addEventListener('change', () => {
    if (count) count.textContent = `附件 (${file.files?.length ?? 0})`
  })

  // 轉址回來時顯示成功訊息並清掉網址參數
  if (new URLSearchParams(location.search).get('sent') === '1') {
    const banner = document.getElementById('formBanner')
    if (banner) banner.hidden = false
    document.getElementById('contact')?.scrollIntoView()
    history.replaceState(null, '', location.pathname + location.hash)
  }
}

// ---------- 訂閱最新資訊（MailerLite） ----------
// 啟用方式：在 MailerLite 後台建立 Embedded Form，把表單的 action URL 貼到下面
// 格式像：https://assets.mailerlite.com/jsonp/XXXXXX/forms/YYYYYYYYYY/subscribe
const MAILERLITE_FORM_ACTION =
  'https://assets.mailerlite.com/jsonp/2425992/forms/189988429026559775/subscribe'

function initSubscribe(): void {
  const form = document.getElementById('subscribeForm') as HTMLFormElement | null
  const status = document.getElementById('subscribeStatus')
  if (!form || !status) return

  const show = (msg: string, ok: boolean): void => {
    status.textContent = msg
    status.classList.toggle('ok', ok)
    status.classList.toggle('err', !ok)
    status.hidden = false
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!MAILERLITE_FORM_ACTION) {
      show('訂閱功能即將開放，敬請期待！', true)
      return
    }
    const btn = form.querySelector('button')!
    btn.disabled = true
    try {
      const res = await fetch(`${MAILERLITE_FORM_ACTION}?ajax=1`, {
        method: 'POST',
        body: new FormData(form),
      })
      const data = await res.json()
      if (data.success) {
        show('✓ 已收到您的訂閱，請至信箱點擊確認信完成訂閱！', true)
        form.reset()
      } else {
        show('訂閱失敗，請確認電子郵件格式後再試一次。', false)
      }
    } catch {
      show('連線發生問題，請稍後再試。', false)
    } finally {
      btn.disabled = false
    }
  })
}

// ---------- Sticky 導覽列 ----------
function initNav(): void {
  const nav = document.getElementById('siteNav')
  const toggle = document.getElementById('navToggle')
  if (!nav || !toggle) return

  window.addEventListener(
    'scroll',
    () => nav.classList.toggle('scrolled', window.scrollY > 8),
    { passive: true },
  )
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open')
    toggle.setAttribute('aria-expanded', String(open))
  })
  nav.querySelectorAll('.nav-links a').forEach((a) =>
    a.addEventListener('click', () => nav.classList.remove('open')),
  )
}

// ---------- 提示詞 pill 分頁 ----------
function initPromptTabs(): void {
  const tabs = [...document.querySelectorAll<HTMLButtonElement>('#promptTabs button')]
  const panels = [...document.querySelectorAll<HTMLElement>('#promptPanels .prompt-block')]
  if (!tabs.length || tabs.length !== panels.length) return

  tabs.forEach((tab, i) =>
    tab.addEventListener('click', () => {
      tabs.forEach((t, j) => {
        t.classList.toggle('active', i === j)
        t.setAttribute('aria-selected', String(i === j))
      })
      panels.forEach((p, j) => {
        p.hidden = i !== j
        p.classList.toggle('active', i === j)
      })
    }),
  )
}

// ---------- 捲動進場動畫 ----------
function initReveal(): void {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

  const targets = document.querySelectorAll(
    [
      '.section-heading',
      '.media-row',
      '.feature-card',
      '.challenge-card',
      '.quote-card',
      '.compare',
      '.video-card',
      '.event-card',
      '.subscribe-box',
      '.prompt-tab-list',
      '.prompt-blocks',
      '.carousel',
      '.feature-figure',
      '.centered-copy',
      '.contact-grid > *',
      '.course .media-row-media',
      '.course .media-row-copy',
    ].join(','),
  )

  // 同一容器內的兄弟元素做 60ms 階梯延遲
  const groups = new Map<Element, number>()
  targets.forEach((el) => {
    const parent = el.parentElement!
    const idx = groups.get(parent) ?? 0
    groups.set(parent, idx + 1)
    ;(el as HTMLElement).style.transitionDelay = `${Math.min(idx, 5) * 60}ms`
    el.classList.add('reveal')
  })

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('reveal-in')
          io.unobserve(e.target)
        }
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
  )
  targets.forEach((el) => io.observe(el))
}

initReveal()
initNav()
initFaq()
initCarousel()
initEventsDots()
initContactForm()
initSubscribe()
initPromptTabs()
