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

initFaq()
initCarousel()
initEventsDots()
initContactForm()
