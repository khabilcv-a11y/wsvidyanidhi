import { useEffect, useState } from 'react'
import { Choice, Label, Text } from './form.jsx'
import { recentYears } from '../lib/lists.js'

// Text box that suggests matches as people type (they can still type anything).
export function Combo({ name, label, form, set, disabled, required, options, full, hint, placeholder }) {
  const id = `f_${name}`
  const list = `${id}_list`
  return (
    <div className={`field${full ? ' full' : ''}`}>
      <Label htmlFor={id} name={name} required={required}>{label}</Label>
      <input id={id} list={list} disabled={disabled} required={required} autoComplete="off" placeholder={placeholder}
        value={form[name] ?? ''} onChange={(e) => set(name, e.target.value)} aria-describedby={hint ? `${id}_h` : undefined} />
      <datalist id={list}>{options.slice(0, 600).map((o) => <option key={o} value={o} />)}</datalist>
      {hint && <p className="hint" id={`${id}_h`}>{hint}</p>}
    </div>
  )
}

// Buttons, where the last one ("Others") opens a box to type the answer. The typed text is kept in `${name}_other`.
export function ChoiceOther({ name, otherValue = 'others', ...props }) {
  const { form, set, disabled } = props
  const on = String(form[name] ?? '') === otherValue
  return (
    <>
      <Choice name={name} {...props} />
      {on && (
        <div className="field full other-box">
          <label htmlFor={`f_${name}_other`}>Please write it</label>
          <input id={`f_${name}_other`} disabled={disabled} value={form[`${name}_other`] ?? ''} onChange={(e) => set(`${name}_other`, e.target.value)} />
        </div>
      )}
    </>
  )
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

// Date of birth as three simple lists (day, month, year); far easier than a calendar for a birth date.
export function DatePick({ name, label, form, set, disabled, required }) {
  const value = String(form[name] ?? '')
  const [y, m, d] = value ? value.split('-') : ['', '', '']
  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: 40 }, (_, i) => String(thisYear - 14 - i))
  const update = (ny, nm, nd) => {
    if (!ny && !nm && !nd) return set(name, '')
    set(name, [ny || '', nm || '', nd || ''].join('-'))
  }
  const id = `f_${name}`
  return (
    <div className="field full" role="group" aria-labelledby={`${id}_l`}>
      <Label id={`${id}_l`} name={name} required={required}>{label}</Label>
      <div className="date-pick">
        <select aria-label="Day" disabled={disabled} value={d || ''} onChange={(e) => update(y, m, e.target.value)}>
          <option value="">Day</option>
          {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')).map((x) => <option key={x} value={x}>{Number(x)}</option>)}
        </select>
        <select aria-label="Month" disabled={disabled} value={m || ''} onChange={(e) => update(y, e.target.value, d)}>
          <option value="">Month</option>
          {MONTHS.map((x, i) => <option key={x} value={String(i + 1).padStart(2, '0')}>{x}</option>)}
        </select>
        <select aria-label="Year" disabled={disabled} value={y || ''} onChange={(e) => update(e.target.value, m, d)}>
          <option value="">Year</option>
          {years.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
    </div>
  )
}

// Recent years as buttons; "Other" lets them type any year.
export function YearChoice({ name, label, form, set, disabled, required, count = 5 }) {
  const years = recentYears(count)
  const value = String(form[name] ?? '')
  const [other, setOther] = useState(() => Boolean(value) && !years.includes(value))
  const view = other ? '__other' : value
  return (
    <>
      <Choice name={name} label={label} disabled={disabled} required={required} form={{ [name]: view }}
        options={[...years, ['__other', 'Other year']]}
        set={(n, v) => {
          if (v === '__other') {
            setOther(true)
            set(name, '')
          } else {
            setOther(false)
            set(name, v)
          }
        }} />
      {other && (
        <div className="field full other-box">
          <label htmlFor={`f_${name}_typed`}>Write the year</label>
          <input id={`f_${name}_typed`} type="number" inputMode="numeric" min="1980" max="2100" disabled={disabled}
            value={value} onChange={(e) => set(name, e.target.value)} />
        </div>
      )}
    </>
  )
}

// Several buttons can be chosen; the answer is kept as "2022, 2023".
export function MultiChoice({ name, label, form, set, disabled, options }) {
  const chosen = String(form[name] ?? '').split(',').map((x) => x.trim()).filter(Boolean)
  const id = `f_${name}`
  const toggle = (v) => {
    const next = chosen.includes(v) ? chosen.filter((x) => x !== v) : [...chosen, v].sort()
    set(name, next.join(', '))
  }
  return (
    <div className="field full" role="group" aria-labelledby={`${id}_l`}>
      <Label id={`${id}_l`} name={name}>{label}</Label>
      <div className="choice">
        {options.map((o) => (
          <button key={o} type="button" aria-pressed={chosen.includes(o)} className={chosen.includes(o) ? 'on' : ''} disabled={disabled} onClick={() => toggle(o)}>{o}</button>
        ))}
      </div>
    </div>
  )
}

// WhatsApp number: tick if it is the same as the mobile number, otherwise type it.
export function WhatsApp({ form, set, disabled }) {
  const same = !form.whatsapp || form.whatsapp === form.phone
  const [asked, setAsked] = useState(false)
  const showBox = asked || !same
  return (
    <div className="field full">
      <label className="check">
        <input type="checkbox" disabled={disabled} checked={!showBox}
          onChange={(e) => {
            if (e.target.checked) {
              setAsked(false)
              set('whatsapp', form.phone || '')
            } else {
              setAsked(true)
              set('whatsapp', '')
            }
          }} />
        <span>My WhatsApp number is the same as my mobile number</span>
      </label>
      {showBox && <Text form={form} set={set} disabled={disabled} name="whatsapp" label="WhatsApp number" type="tel" inputMode="numeric" />}
    </div>
  )
}

// PIN code: when six digits are typed, look up the post offices for it (India Post public data).
export function PinLookup({ form, set, disabled }) {
  const pin = String(form.pin_code ?? '')
  const [offices, setOffices] = useState([])
  const [state, setState] = useState('idle')
  useEffect(() => {
    if (!/^\d{6}$/.test(pin)) {
      setOffices([])
      setState('idle')
      return undefined
    }
    let live = true
    setState('loading')
    fetch(`https://api.postalpincode.in/pincode/${pin}`)
      .then((r) => r.json())
      .then((r) => {
        if (!live) return
        const list = r?.[0]?.PostOffice || []
        setOffices(list)
        setState(list.length ? 'ok' : 'none')
        if (list.length === 1 && !form.post_office) set('post_office', list[0].Name)
        const district = list[0]?.District
        if (district && !form.district) {
          const match = ['Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod']
            .find((k) => k.toLowerCase() === String(district).toLowerCase())
          if (match) set('district', match)
        }
      })
      .catch(() => live && setState('error'))
    return () => { live = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin])

  return (
    <>
      <Text form={form} set={set} disabled={disabled} name="pin_code" label="PIN code" inputMode="numeric" maxLength={6}
        hint={state === 'loading' ? 'Looking up post offices…' : state === 'none' ? 'We could not find this PIN code. Please check it, or type your post office below.' : undefined} />
      {offices.length > 1 ? (
        <div className="field">
          <label htmlFor="f_post_pick">Post office</label>
          <select id="f_post_pick" disabled={disabled} value={form.post_office ?? ''} onChange={(e) => set('post_office', e.target.value)}>
            <option value="">Select your post office</option>
            {offices.map((o) => <option key={o.Name} value={o.Name}>{o.Name}</option>)}
          </select>
        </div>
      ) : (
        <Text form={form} set={set} disabled={disabled} name="post_office" label="Post office" />
      )}
    </>
  )
}

// Back papers: one row for each paper, with its subject and semester.
export function Backpapers({ form, set, disabled }) {
  const rows = String(form.backpapers ?? '').split('\n').filter((r) => r.trim()).map((r) => {
    const [subject, sem] = r.split('|')
    return { subject: (subject || '').trim(), sem: (sem || '').trim() }
  })
  const list = rows.length ? rows : [{ subject: '', sem: '' }]
  const save = (next) => {
    set('backpapers', next.filter((r) => r.subject || r.sem).map((r) => `${r.subject}|${r.sem}`).join('\n'))
    set('backpaper_count', next.filter((r) => r.subject).length)
  }
  const edit = (i, patch) => save(list.map((r, k) => (k === i ? { ...r, ...patch } : r)))
  return (
    <div className="field full">
      <Label htmlFor="bp_0" name="backpapers">Which papers are pending?</Label>
      {list.map((r, i) => (
        <div key={i} className="bp-row">
          <input id={`bp_${i}`} aria-label={`Subject ${i + 1}`} placeholder="Subject name" disabled={disabled} value={r.subject}
            onChange={(e) => edit(i, { subject: e.target.value })} />
          <select aria-label={`Semester for subject ${i + 1}`} disabled={disabled} value={r.sem} onChange={(e) => edit(i, { sem: e.target.value })}>
            <option value="">Semester</option>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'].map((s) => <option key={s} value={s}>Semester {s}</option>)}
          </select>
          {list.length > 1 && !disabled && <button type="button" className="btn ghost small" onClick={() => save(list.filter((_, k) => k !== i))}>Remove</button>}
        </div>
      ))}
      {!disabled && list.length < 12 && (
        <button type="button" className="btn outline small" onClick={() => save([...list, { subject: '', sem: '' }])}>+ Add another paper</button>
      )}
    </div>
  )
}
