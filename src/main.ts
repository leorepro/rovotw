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

// ---------- 聯絡表單（僅外觀，送出功能之後另行實作） ----------
function initContactForm(): void {
  document.getElementById('contactForm')?.addEventListener('submit', (e) => {
    e.preventDefault()
  })
}

initFaq()
initCarousel()
initEventsDots()
initContactForm()
