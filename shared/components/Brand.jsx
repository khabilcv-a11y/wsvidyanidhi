import logo from '../brand/logo-wisdom-students.png'

export const BrandMark = () => <img className="brand-logo" src={logo} alt="Wisdom Students" width="260" height="31" />

// Wisdom Students logo with the programme name beside it.
export default function Brand({ sub, href }) {
  return (
    <a className="brand" href={href || '/'}>
      <BrandMark />
      {sub && <span className="brand-sub">{sub.split(/(Vidyanidhi)/i).map((part, i) => (/^vidyanidhi$/i.test(part) ? <mark key={i} className="vn">{part.toUpperCase()}</mark> : part))}</span>}
    </a>
  )
}
