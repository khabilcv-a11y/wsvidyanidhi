// Accessibility preferences, stored on this device only. Used by the landing page and both portals.
const KEY = 'vn_a11y'
const DEFAULTS = { text: 'md', theme: 'light', motion: 'auto', links: 'auto' }

export function loadPrefs() {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) || '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}

export function applyPrefs(p = loadPrefs()) {
  const root = document.documentElement
  root.dataset.text = p.text
  root.dataset.theme = p.theme
  root.dataset.motion = p.motion
  root.dataset.links = p.links
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.content = p.theme === 'dark' ? '#0d1713' : p.theme === 'contrast' ? '#000000' : '#0a7552'
}

export function setPref(key, value) {
  const next = { ...loadPrefs(), [key]: value }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* private mode: the choice lasts for this visit only */
  }
  applyPrefs(next)
  return next
}

const LABELS = {
  en: {
    open: 'Accessibility settings', title: 'Accessibility', text: 'Text size', theme: 'Colours',
    motion: 'Motion', links: 'Links', normal: 'Normal', large: 'Large', xl: 'Extra large',
    light: 'Light', dark: 'Dark', contrast: 'High contrast', reduce: 'Reduce motion', underline: 'Underline links', reset: 'Reset',
  },
  ml: {
    open: 'ആക്സസിബിലിറ്റി ക്രമീകരണങ്ങൾ', title: 'ആക്സസിബിലിറ്റി', text: 'അക്ഷര വലുപ്പം', theme: 'നിറങ്ങൾ',
    motion: 'ചലനം', links: 'ലിങ്കുകൾ', normal: 'സാധാരണ', large: 'വലുത്', xl: 'കൂടുതൽ വലുത്',
    light: 'ലൈറ്റ്', dark: 'ഡാർക്ക്', contrast: 'ഉയർന്ന കോൺട്രാസ്റ്റ്', reduce: 'ചലനം കുറയ്ക്കുക', underline: 'ലിങ്കുകൾക്ക് അടിവര', reset: 'പുനഃക്രമീകരിക്കുക',
  },
}

// Builds the settings button and panel inside `host`. Call again with a new lang to relabel.
export function mountAccessMenu(host, lang = 'en') {
  const L = LABELS[lang] || LABELS.en
  const id = 'a11y-panel'
  host.innerHTML = ''
  host.classList.add('a11y')

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'btn ghost small'
  button.setAttribute('aria-expanded', 'false')
  button.setAttribute('aria-controls', id)
  button.setAttribute('aria-label', L.open)
  button.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="7.5" r="1.3" fill="currentColor"/><path d="M7 10.5h10M12 10.5V16m0 0-2.5 3.5M12 16l2.5 3.5"/></svg>'

  const panel = document.createElement('div')
  panel.id = id
  panel.className = 'a11y-panel'
  panel.hidden = true
  panel.setAttribute('role', 'group')
  panel.setAttribute('aria-label', L.title)

  const group = (legend, key, options) => {
    const fs = document.createElement('fieldset')
    fs.innerHTML = `<legend>${legend}</legend><div class="seg"></div>`
    const seg = fs.querySelector('.seg')
    options.forEach(([value, label]) => {
      const b = document.createElement('button')
      b.type = 'button'
      b.textContent = label
      b.dataset.key = key
      b.dataset.value = value
      seg.append(b)
    })
    return fs
  }
  panel.append(
    group(L.text, 'text', [['md', 'A'], ['lg', 'A+'], ['xl', 'A++']]),
    group(L.theme, 'theme', [['light', L.light], ['dark', L.dark], ['contrast', L.contrast]]),
    group(L.motion, 'motion', [['reduce', L.reduce]]),
    group(L.links, 'links', [['underline', L.underline]]),
  )
  const reset = document.createElement('button')
  reset.type = 'button'
  reset.className = 'btn outline small'
  reset.textContent = L.reset
  panel.append(reset)
  host.append(button, panel)

  const sync = () => {
    const p = loadPrefs()
    panel.querySelectorAll('[data-key]').forEach((b) => {
      b.setAttribute('aria-pressed', String(p[b.dataset.key] === b.dataset.value))
    })
  }
  const close = () => {
    panel.hidden = true
    button.setAttribute('aria-expanded', 'false')
  }
  button.addEventListener('click', () => {
    panel.hidden = !panel.hidden
    button.setAttribute('aria-expanded', String(!panel.hidden))
    if (!panel.hidden) panel.querySelector('button').focus()
  })
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-key]')
    if (!b) return
    const { key, value } = b.dataset
    const toggle = key === 'motion' || key === 'links'
    const on = loadPrefs()[key] === value
    setPref(key, toggle && on ? 'auto' : value)
    sync()
  })
  reset.addEventListener('click', () => {
    Object.entries(DEFAULTS).forEach(([k, v]) => setPref(k, v))
    sync()
  })
  host.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !panel.hidden) {
      close()
      button.focus()
    }
  })
  const onDocClick = (e) => {
    if (!host.contains(e.target)) close()
  }
  document.addEventListener('click', onDocClick)
  sync()
  return () => {
    document.removeEventListener('click', onDocClick)
    host.replaceChildren()
  }
}
