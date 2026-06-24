// 導覽列語言切換下拉選單的互動：開合、勾選當前語言、點選即切換
import { LOCALES, setLocale, type Locale } from './index'

export function initSwitcher(initial: Locale): void {
  const root = document.getElementById('langSwitch')
  if (!root) return

  const btn = root.querySelector<HTMLButtonElement>('.lang-switch__btn')!
  const menu = root.querySelector<HTMLUListElement>('.lang-switch__menu')!
  const current = root.querySelector<HTMLElement>('[data-lang-current]')!
  const options = [...menu.querySelectorAll<HTMLButtonElement>('button[data-lang]')]

  const nativeOf = (code: Locale): string =>
    LOCALES.find((l) => l.code === code)?.native ?? code

  // 反映目前語言：更新觸發鈕文字與選項勾選/aria-selected
  const reflect = (code: Locale): void => {
    current.textContent = nativeOf(code)
    options.forEach((opt) => {
      const active = opt.dataset.lang === code
      opt.classList.toggle('is-active', active)
      opt.setAttribute('aria-selected', String(active))
    })
  }

  const open = (): void => {
    menu.hidden = false
    btn.setAttribute('aria-expanded', 'true')
  }
  const close = (): void => {
    menu.hidden = true
    btn.setAttribute('aria-expanded', 'false')
  }
  const toggle = (): void => (menu.hidden ? open() : close())

  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    toggle()
  })

  options.forEach((opt) =>
    opt.addEventListener('click', () => {
      const code = opt.dataset.lang as Locale
      close()
      void setLocale(code)
    }),
  )

  // 點選單外、按 Esc 都收合
  document.addEventListener('click', (e) => {
    if (!root.contains(e.target as Node)) close()
  })
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      close()
      btn.focus()
    }
  })

  // 語言改變時（不論是這顆下拉或他處觸發）同步反映
  document.addEventListener('i18n:change', (e) => {
    reflect((e as CustomEvent<{ to: Locale }>).detail.to)
  })

  reflect(initial)
}
