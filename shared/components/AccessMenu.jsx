import { useEffect, useRef } from 'react'
import { mountAccessMenu } from '../a11y.js'
import { useI18n } from '../lib/i18n.jsx'

export default function AccessMenu() {
  const ref = useRef(null)
  const { lang } = useI18n()
  useEffect(() => mountAccessMenu(ref.current, lang), [lang])
  return <span ref={ref} />
}
