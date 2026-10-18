import logo from '../brand/logo-wisdom-students.png'

export const BrandMark = () => <img className="brand-logo" src={logo} alt="Wisdom Students" width="260" height="31" />

// Wisdom Students logo with the programme name beside it.
export default function Brand({ sub, href }) {
  return (
    <a className="brand" href={href || '/'}>
      <BrandMark />
      {sub && <span className="brand-sub">{sub}</span>}
    </a>
  )
}
