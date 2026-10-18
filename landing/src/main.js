import '@shared/styles.css'
import { applyPrefs, mountAccessMenu } from '@shared/a11y.js'
import { ml } from './ml.js'

if (import.meta.env.DEV) {
  // local development: talk to the local backend and the other local sites
  window.__CONFIG__ = {
    ...window.__CONFIG__, apiUrl: 'http://localhost:8787', googleClientId: '', landingUrl: 'http://localhost:5170',
    applicantUrl: 'http://localhost:5173', adminUrl: 'http://localhost:5174',
  }
}
const cfg = window.__CONFIG__ || {}
const $ = (sel, root = document) => root.querySelector(sel)
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)]

applyPrefs()

// ---- language: English is the HTML itself, Malayalam comes from ml.js
function getLang() {
  try {
    return localStorage.getItem('lang') || 'en'
  } catch {
    return 'en'
  }
}
function setLang(lang) {
  try {
    localStorage.setItem('lang', lang)
  } catch {
    /* ignore */
  }
  document.documentElement.lang = lang
  $$('[data-k]').forEach((el) => {
    if (el.dataset.en === undefined) el.dataset.en = el.innerHTML
    const text = lang === 'ml' ? ml[el.dataset.k] : el.dataset.en
    if (text !== undefined) el.innerHTML = text
  })
  const toggle = $('#lang-toggle')
  if (toggle) {
    toggle.textContent = lang === 'ml' ? 'English' : 'മലയാളം'
    toggle.setAttribute('aria-label', lang === 'ml' ? 'Switch language to English' : 'Switch language to Malayalam')
  }
  const host = $('#a11y-host')
  if (host) mountAccessMenu(host, lang)
  showStatus()
}

// ---- links to the two portals
$$('[data-portal]').forEach((a) => {
  const base = a.dataset.portal === 'admin' ? cfg.adminUrl : cfg.applicantUrl
  a.href = base ? base.replace(/\/$/, '') + a.dataset.path : '#'
})

// ---- mobile menu
const menuBtn = $('#menu-toggle')
const nav = $('#site-nav')
if (menuBtn && nav) {
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open')
    menuBtn.setAttribute('aria-expanded', String(open))
  })
  nav.addEventListener('click', (e) => {
    if (e.target.closest('a')) {
      nav.classList.remove('open')
      menuBtn.setAttribute('aria-expanded', 'false')
    }
  })
}
$('#lang-toggle')?.addEventListener('click', () => setLang(getLang() === 'ml' ? 'en' : 'ml'))

// ---- whether applications are open (falls back to the static text if the API is unavailable)
let info = null
function showStatus() {
  const text = $('#status-text')
  const dot = $('#status-pill .dot')
  if (!text || !info) return
  const lang = getLang()
  dot?.classList.toggle('open', info.open)
  if (info.open) {
    text.textContent = lang === 'ml' ? `${ml.statusOpen}: ${info.name}` : `Applications are open: ${info.name}`
  } else {
    text.textContent = lang === 'ml' ? ml.statusClosed : '2026 applications are now closed'
  }
}
if (cfg.apiUrl && $('#status-text')) {
  fetch(cfg.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'public.info', data: {} }),
  })
    .then((r) => r.json())
    .then((r) => {
      if (r.ok) {
        info = r.data
        showStatus()
      }
    })
    .catch(() => {})
}

setLang(getLang())
