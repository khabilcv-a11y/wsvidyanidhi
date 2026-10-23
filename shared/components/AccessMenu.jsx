import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { mountAccessMenu } from '../a11y.js'
import { useI18n } from '../lib/i18n.jsx'

// Accessibility button fixed in the bottom corner. It is rendered at the end of <body> so that
// sticky or blurred headers cannot change where "fixed" is measured from.
export default function AccessMenu() {
  const ref = useRef(null)
  const { lang } = useI18n()
  useEffect(() => mountAccessMenu(ref.current, lang), [lang])
  return createPortal(<span ref={ref} className="a11y-float" />, document.body)
}
