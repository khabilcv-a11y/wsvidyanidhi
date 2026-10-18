import '@shared/styles.css'
import { applyPrefs, mountAccessMenu } from '@shared/a11y.js'
import { initSlideshow } from './slideshow.js'

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

// ---- whether applications are open (falls back to the static text if the API is unavailable)
let info = null
function showStatus() {
  const text = $('#status-text')
  const dot = $('#status-pill .dot')
  if (!text || !info) return
  dot?.classList.toggle('open', info.open)
  if (info.open) {
    text.textContent = `Applications are open: ${info.name}`
  } else {
    text.textContent = '2026 applications are now closed'
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

// ---- header shadow on scroll, scroll reveal
const header = $('#site-header')
const onScroll = () => header && header.classList.toggle('scrolled', window.scrollY > 8)
window.addEventListener('scroll', onScroll, { passive: true })
onScroll()
const items = $$('.reveal')
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('in')
        io.unobserve(e.target)
      }
    })
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' })
  items.forEach((el) => io.observe(el))
} else {
  items.forEach((el) => el.classList.add('in'))
}

initSlideshow()
mountAccessMenu($('#a11y-host'))
showStatus()

// ---- Instagram preview: loaded only when scrolled near, so Instagram gets no data before that
const insta = $('#insta-frame')
if (insta) {
  const load = () => { insta.src = insta.dataset.src }
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting) { load(); io.disconnect() }
    }, { rootMargin: '300px' })
    io.observe(insta)
  } else load()
}

// ---- upcoming events: read from /events.json; past ones (by India date) are dropped automatically
async function initEvents() {
  const section = $('#events')
  const list = $('#events-list')
  if (!section || !list) return
  let items = []
  try {
    const res = await fetch('/events.json', { cache: 'no-cache' })
    if (res.ok) items = await res.json()
  } catch {
    /* nothing to show */
  }
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
  const upcoming = (Array.isArray(items) ? items : [])
    .filter((e) => e && e.title && /^\d{4}-\d{2}-\d{2}$/.test(e.date) && (e.endDate || e.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (upcoming.length === 0) return
  section.hidden = false
  upcoming.forEach((e) => {
    const d = new Date(e.date + 'T00:00:00')
    const li = document.createElement('li')
    const date = document.createElement('div')
    date.className = 'date'
    date.innerHTML = '<b></b><span></span>'
    date.querySelector('b').textContent = d.getDate()
    date.querySelector('span').textContent = d.toLocaleString('en-IN', { month: 'short', year: 'numeric' })
    const body = document.createElement('div')
    const h = document.createElement('h3')
    if (e.link) {
      const a = document.createElement('a')
      a.href = e.link
      a.target = '_blank'
      a.rel = 'noopener'
      a.textContent = e.title
      h.append(a)
    } else h.textContent = e.title
    body.append(h)
    const meta = [e.time, e.venue, e.note].filter(Boolean).join(' · ')
    if (meta) {
      const p = document.createElement('p')
      p.textContent = meta
      body.append(p)
    }
    li.append(date, body)
    list.append(li)
  })
}
initEvents()
