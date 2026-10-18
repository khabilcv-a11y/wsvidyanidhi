import { useI18n } from '../lib/i18n.jsx'

export default function LangToggle() {
  const { lang, setLang } = useI18n()
  const next = lang === 'ml' ? 'en' : 'ml'
  return (
    <button
      type="button"
      className="btn outline small"
      onClick={() => setLang(next)}
      aria-label={next === 'ml' ? 'Switch language to Malayalam' : 'Switch language to English'}
    >
      {next === 'ml' ? 'മലയാളം' : 'English'}
    </button>
  )
}
