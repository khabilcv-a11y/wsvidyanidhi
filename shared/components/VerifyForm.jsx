import { useState } from 'react'
import { label, options } from '../lib/labels.js'

// The field-visit form (guardian check, house, financial condition, Zakat, category, connection with Wisdom).
// Used by the verifier on a phone and by an admin entering a report for a verifier.
export default function VerifyForm({ initial, districts, lang = 'en', busy, onSubmit, submitLabel = 'Submit report' }) {
  const [f, setF] = useState({
    guardian_ok: true, house: '', house_note: '', fin_condition: '', zakat_eligible: '', category: '', wisdom_connection: '',
    remarks: '', wisdom_district: '', ...(initial || {}),
  })
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const T = lang === 'ml'
    ? { guardian: 'രക്ഷിതാവിന്റെ വിവരങ്ങൾ ശരിയാണോ?', house: 'വീട്', fin: 'സാമ്പത്തിക സ്ഥിതി', zakat: 'കുടുംബം സകാത്തിന് അർഹരാണോ?' }
    : { guardian: 'Are the guardian’s details correct?', house: 'House', fin: 'Financial condition', zakat: 'Is the family eligible for Zakat?' }

  const select = (name, text, group, required = true) => (
    <div className="field">
      <label htmlFor={`v_${name}`}>{text}{required && <span className="req" aria-hidden="true"> *</span>}</label>
      <select id={`v_${name}`} required={required} value={f[name]} onChange={set(name)}>
        <option value="">Select…</option>
        {options(group, lang).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
    </div>
  )

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(f) }}>
      <div className="field">
        <span className="label" id="v_guardian">{T.guardian}</span>
        <div className="seg" role="group" aria-labelledby="v_guardian">
          {[[true, label('yesno', 'yes', lang)], [false, label('yesno', 'no', lang)]].map(([v, text]) => (
            <button type="button" key={String(v)} aria-pressed={f.guardian_ok === v}
              onClick={() => setF((x) => ({ ...x, guardian_ok: v }))}>{text}</button>
          ))}
        </div>
      </div>
      {select('house', T.house, 'house')}
      {f.house === 'other' && (
        <div className="field">
          <label htmlFor="v_house_note">Details</label>
          <input id="v_house_note" value={f.house_note} onChange={set('house_note')} />
        </div>
      )}
      {select('fin_condition', T.fin, 'fin_condition')}
      {select('zakat_eligible', T.zakat, 'yesno')}
      {select('category', 'Category', 'zakat_category')}
      {select('wisdom_connection', 'Connection with Wisdom', 'connection')}
      <div className="field">
        <label htmlFor="v_district">Wisdom district</label>
        <select id="v_district" value={f.wisdom_district} onChange={set('wisdom_district')}>
          <option value="">Select…</option>
          {(districts || []).map((d) => <option key={d}>{d}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="v_remarks">Remarks (reason for recommending or not)</label>
        <textarea id="v_remarks" rows={4} value={f.remarks} onChange={set('remarks')} />
      </div>
      <button className="btn block" disabled={busy}>{busy && <span className="spinner" />}{submitLabel}</button>
    </form>
  )
}
