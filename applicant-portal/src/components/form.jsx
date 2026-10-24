import { useState } from 'react'
import { HELP_ML, SECTIONS, UPLOAD_NOTE } from '../lib/sections.js'

// Round "i" button. Opens a short explanation in Malayalam under the question.
export function Help({ name, id }) {
  const [open, setOpen] = useState(false)
  const text = HELP_ML[name]
  if (!text) return null
  const panel = `${id}_help`
  return (
    <>
      <button type="button" className="info-btn" aria-expanded={open} aria-controls={panel} onClick={() => setOpen(!open)}>
        <span className="i" aria-hidden="true">i</span>
        <span lang="ml">മലയാളം</span>
        <span className="visually-hidden">: explain this question in Malayalam</span>
      </button>
      {open && <p className="help" id={panel} lang="ml">{text}</p>}
    </>
  )
}

export function Label({ htmlFor, id, name, required, children }) {
  return (
    <div className="q-head">
      <label htmlFor={htmlFor} id={id}>{children}{required && <span className="req" aria-hidden="true"> *</span>}</label>
      <Help name={name} id={id || htmlFor} />
    </div>
  )
}

export function Text({ name, label, form, set, disabled, required, type = 'text', hint, full, textarea, ...rest }) {
  const id = `f_${name}`
  const props = {
    id, disabled, required, value: form[name] ?? '', onChange: (e) => set(name, e.target.value),
    'aria-describedby': hint ? `${id}_h` : undefined, ...rest,
  }
  return (
    <div className={`field${full ? ' full' : ''}`}>
      <Label htmlFor={id} name={name} required={required}>{label}</Label>
      {textarea ? <textarea rows={3} {...props} /> : <input type={type} {...props} />}
      {hint && <p className="hint" id={`${id}_h`}>{hint}</p>}
    </div>
  )
}

export function Select({ name, label, form, set, disabled, required, options, placeholder = 'Select…', full }) {
  const id = `f_${name}`
  return (
    <div className={`field${full ? ' full' : ''}`}>
      <Label htmlFor={id} name={name} required={required}>{label}</Label>
      <select id={id} disabled={disabled} required={required} value={form[name] ?? ''} onChange={(e) => set(name, e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

// A row of buttons, one of which is chosen. Behaves as a radio group for screen readers.
export function Choice({ name, label, form, set, disabled, required, options, full = true }) {
  const id = `f_${name}`
  const value = String(form[name] ?? '')
  return (
    <div className={`field${full ? ' full' : ''}`} role="radiogroup" aria-labelledby={`${id}_l`}>
      <Label id={`${id}_l`} name={name} required={required}>{label}</Label>
      <div className="choice">
        {options.map((o) => {
          const [v, text] = Array.isArray(o) ? o : [o, o]
          const on = value === String(v)
          return (
            <button key={v} type="button" role="radio" aria-checked={on} className={on ? 'on' : ''} disabled={disabled}
              onClick={() => set(name, on && !required ? '' : v)}>
              {text}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// Everything the form asks for, so a family can get ready before starting.
export function PrepareList({ docs = [], limitNote = UPLOAD_NOTE }) {
  return (
    <div className="prepare">
      {SECTIONS.filter((s) => s.key !== 'review').map((s, i) => (
        <details key={s.key} open={s.key === 'documents'}>
          <summary><span className="n">{i + 1}</span>{s.title}</summary>
          {s.key === 'documents' ? (
            <>
              <p className="mt-0">You will be asked to upload these at the end:</p>
              <ul>
                {docs.length ? docs.map((d) => <li key={d.label}>{d.label}{d.required ? '' : ' (optional)'}</li>) : <li>Qualification certificate, fee receipt, recommendation letter, ration card</li>}
              </ul>
              <p className="small muted">{limitNote}</p>
            </>
          ) : (
            <ul>{s.ready.map((r) => <li key={r}>{r}</li>)}</ul>
          )}
        </details>
      ))}
    </div>
  )
}
