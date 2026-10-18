// Photo slideshow for the Intellectual Meet section.
// Photos and captions come from /meets/meets.json; the section stays hidden until there is at least one photo.

const $ = (id) => document.getElementById(id)

export async function initSlideshow() {
  const section = $('meets')
  if (!section) return

  let items = []
  try {
    const res = await fetch('/meets/meets.json', { cache: 'no-cache' })
    if (res.ok) items = await res.json()
  } catch {
    /* no photos yet */
  }
  items = Array.isArray(items) ? items.filter((i) => i && i.src) : []
  if (items.length === 0) return
  section.hidden = false

  const img = $('slide-img')
  const cap = $('slide-cap')
  const count = $('slide-count')
  const dots = $('slide-dots')
  const play = $('slide-play')
  const region = $('slides')
  const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce'

  let index = 0
  let timer = null
  let playing = !reduce()
  let hovering = false

  const url = (i) => '/meets/' + items[i].src
  const caption = (i) => [items[i].caption, items[i].year].filter(Boolean).join(' · ')

  items.forEach((_, i) => {
    if (items.length > 14) return
    const b = document.createElement('button')
    b.type = 'button'
    b.setAttribute('aria-label', `Photo ${i + 1} of ${items.length}`)
    b.addEventListener('click', () => show(i, true))
    dots.append(b)
  })

  function show(i, user) {
    index = (i + items.length) % items.length
    img.classList.add('fade')
    const next = new Image()
    next.onload = () => {
      img.src = next.src
      img.alt = items[index].alt || items[index].caption || 'Intellectual Meet'
      img.classList.remove('fade')
    }
    next.src = url(index)
    cap.textContent = caption(index)
    count.textContent = `${index + 1} / ${items.length}`
    ;[...dots.children].forEach((d, k) => d.setAttribute('aria-current', String(k === index)))
    // warm the cache for the photo after this one
    new Image().src = url((index + 1) % items.length)
    if (user) restart()
  }

  function tick() {
    if (playing && !hovering && !document.hidden) show(index + 1)
  }
  function restart() {
    clearInterval(timer)
    timer = setInterval(tick, 5500)
  }
  function setPlaying(on) {
    playing = on
    play.textContent = on ? 'Pause' : 'Play'
    play.setAttribute('aria-label', on ? 'Pause slideshow' : 'Play slideshow')
  }

  $('slide-prev').addEventListener('click', () => show(index - 1, true))
  $('slide-next').addEventListener('click', () => show(index + 1, true))
  play.addEventListener('click', () => setPlaying(!playing))
  region.addEventListener('mouseenter', () => { hovering = true })
  region.addEventListener('mouseleave', () => { hovering = false })
  region.addEventListener('focusin', () => { hovering = true })
  region.addEventListener('focusout', () => { hovering = false })
  region.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') show(index - 1, true)
    if (e.key === 'ArrowRight') show(index + 1, true)
  })
  let startX = null
  region.addEventListener('pointerdown', (e) => { startX = e.clientX })
  region.addEventListener('pointerup', (e) => {
    if (startX !== null && Math.abs(e.clientX - startX) > 45) show(index + (e.clientX < startX ? 1 : -1), true)
    startX = null
  })

  setPlaying(playing)
  show(0)
  restart()
}
