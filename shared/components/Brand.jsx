export function BrandMark() {
  return (
    <svg className="brand-mark" viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="13" fill="#0a7552" />
      <path d="M24 11 7 19l17 8 17-8z" fill="#fff" />
      <path d="M14 24v8c0 3 4.5 6 10 6s10-3 10-6v-8l-10 5z" fill="#ffb81c" />
    </svg>
  )
}

export default function Brand({ title, sub, href }) {
  return (
    <a className="brand" href={href || '/'}>
      <BrandMark />
      <span>
        {title}
        {sub && <small>{sub}</small>}
      </span>
    </a>
  )
}
