import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { call } from '@shared/lib/api.js'
import { DISTRICTS } from '@shared/lib/constants.js'
import { EDITABLE, useAppData } from './AppData.jsx'
import { Slot, UploadNote } from './Documents.jsx'
import { Choice, PrepareList, Select, Text } from '../components/form.jsx'
import { LABELS, REQUIRED, REVIEW_GROUPS, SECTIONS, SELECT_OPTIONS as OPT } from '../lib/sections.js'

const APPLICANT_FIELDS = [
  'full_name', 'gender', 'dob', 'district', 'address', 'phone', 'whatsapp',
  'guardian_name', 'guardian_phone', 'guardian_occupation', 'family_income',
  'native_place', 'post_office', 'pin_code', 'email',
]
const APPLICATION_FIELDS = [
  'course', 'subject', 'course_type', 'stream', 'duration_years', 'year_of_study',
  'completion_month', 'university', 'college', 'last_exam', 'last_exam_year', 'last_percentage',
  'category', 'gpa', 'has_backpapers', 'backpaper_count', 'college_state', 'college_district', 'college_address',
  'prev_qualification', 'prev_university', 'prev_college', 'hosteller',
  'tuition_fees', 'hostel_fees', 'travel_expense', 'expense_per_year',
  'wisdom_scholarship', 'wisdom_scholarship_year', 'other_scholarship', 'other_scholarship_name',
  'other_scholarship_provider', 'other_scholarship_amount',
]
const COST_FIELDS = ['tuition_fees', 'hostel_fees', 'travel_expense']
const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k] ?? '']))
const nice = (k, v) => {
  if (v === 'yes') return 'Yes'
  if (v === 'no') return 'No'
  const hit = Object.values(OPT).flat().find((o) => Array.isArray(o) && o[0] === v)
  return hit ? hit[1] : v
}

function Form({ data, reload }) {
  const app = data.application
  const readOnly = !EDITABLE.includes(app.status)
  const [form, setForm] = useState(() => ({ ...(data.applicant ?? {}), ...app }))
  const [step, setStep] = useState(0)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [otherState, setOtherState] = useState(() => Boolean(app.college_state) && !OPT.college_state.includes(app.college_state))
  const dirty = useRef(false)
  const latest = useRef(form)
  const top = useRef(null)
  useEffect(() => {
    latest.current = form
  }, [form])

  const set = (k, v) => {
    dirty.current = true
    setForm((f) => {
      const next = { ...f, [k]: v }
      if (COST_FIELDS.includes(k)) next.expense_per_year = COST_FIELDS.reduce((n, x) => n + (Number(next[x]) || 0), 0)
      return next
    })
  }

  const save = useCallback(async () => {
    const f = latest.current
    await call('app.save', { id: app.id, applicant: pick(f, APPLICANT_FIELDS), application: pick(f, APPLICATION_FIELDS) })
    dirty.current = false
    setSavedAt(new Date())
  }, [app.id])

  // Save 2 seconds after the last edit
  useEffect(() => {
    if (readOnly || !dirty.current) return undefined
    const id = setTimeout(() => save().catch((e) => setError(e.message)), 2000)
    return () => clearTimeout(id)
  }, [form, readOnly, save])

  async function go(next) {
    setError(null)
    if (!readOnly && dirty.current) {
      try {
        await save()
      } catch (e) {
        setError(e.message)
        return
      }
    }
    setStep(next)
    top.current?.scrollIntoView({ block: 'start' })
  }

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      await save()
      await call('app.submit', { id: app.id })
      await reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const keys = SECTIONS.map((s) => s.key)
  const key = keys[step]
  const c = { form, set, disabled: readOnly }
  const missing = REQUIRED.filter(([f]) => !String(form[f] ?? '').trim())
  const docs = data.doc_types.map((t) => ({ label: t.label_en, required: t.required }))
  const latestDoc = (id) => data.docs.find((d) => d.doc_type_id === id)
  const stateView = otherState ? '__other' : form.college_state

  if (app.application_no && readOnly) {
    return (
      <div className="stack">
        <div className="card done-card">
          <p className="eyebrow">Application received</p>
          <h1 style={{ fontSize: '1.7rem' }}>Thank you, {String(form.full_name || '').split(' ')[0] || 'applicant'}.</h1>
          <p>Your application number is</p>
          <p className="big-no">{app.application_no}</p>
          <p>Please note it down. Next time, open <strong>Continue or check status</strong> and enter this number with your mobile number to see where your application stands.</p>
          <p className="mb-0"><Link className="btn accent" to="/">See my application status</Link> <Link className="btn outline" to="/documents">Add or replace documents</Link></p>
        </div>
      </div>
    )
  }

  return (
    <div className="stack" ref={top}>
      <div className="page-title">
        <h1>Application</h1>
        {app.application_no && <span className="badge sun">No. {app.application_no}</span>}
      </div>
      {readOnly && <p className="alert">This application has been submitted and can no longer be edited here. <Link to="/documents">Documents</Link></p>}

      <details className="ready-box">
        <summary>What to keep ready</summary>
        <PrepareList docs={docs} />
      </details>

      <nav aria-label="Sections">
        <ol className="stepper">
          {SECTIONS.map((s, i) => (
            <li key={s.key}>
              <button type="button" className={i === step ? 'now' : ''} aria-current={i === step ? 'step' : undefined} onClick={() => go(i)}>
                <span className="n">{i + 1}</span>{s.short}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <div className="card">
        <h2 style={{ fontSize: '1.3rem' }}>{SECTIONS[step].title}</h2>

        {key === 'personal' && (
          <div className="form-grid">
            <Text {...c} name="full_name" label="Full name (as on your SSLC certificate)" required autoComplete="name" />
            <Choice {...c} name="gender" label="Gender" options={OPT.gender} required full />
            <Text {...c} name="dob" label="Date of birth" type="date" required autoComplete="bday" />
            <Select {...c} name="district" label="Native district" options={DISTRICTS} required />
            <Text {...c} name="native_place" label="Native place" />
            <Text {...c} name="phone" label="Mobile number" type="tel" inputMode="numeric" required autoComplete="tel" />
            <Text {...c} name="whatsapp" label="WhatsApp number (if different)" type="tel" inputMode="numeric" />
            <Text {...c} name="email" label="Email (optional)" type="email" autoComplete="email" />
            <Text {...c} name="address" label="Address" textarea full autoComplete="street-address" />
            <Text {...c} name="post_office" label="Post office" />
            <Text {...c} name="pin_code" label="PIN code" inputMode="numeric" maxLength={6} />
          </div>
        )}

        {key === 'guardian' && (
          <div className="form-grid">
            <Text {...c} name="guardian_name" label="Parent or guardian name" required />
            <Text {...c} name="guardian_phone" label="Guardian phone" type="tel" inputMode="numeric" />
            <Text {...c} name="guardian_occupation" label="Guardian occupation" />
            <Text {...c} name="family_income" label="Total yearly family income (₹)" type="number" min="0" inputMode="numeric" />
          </div>
        )}

        {key === 'course' && (
          <div className="form-grid">
            <Choice {...c} name="category" label="Course category" options={OPT.category} />
            <Text {...c} name="course" label="Course (for example B.Tech, MBBS, BA)" required />
            <Text {...c} name="subject" label="Main subject" />
            <Choice {...c} name="course_type" label="Type of college" options={OPT.course_type} />
            <Choice {...c} name="stream" label="Field of study" options={OPT.stream} />
            <Choice {...c} name="duration_years" label="Course duration (years)" options={OPT.duration_years} />
            <Choice {...c} name="year_of_study" label="Current year of study" options={OPT.year_of_study} />
            <Text {...c} name="completion_month" label="Course ends in (month and year)" type="month" />
            <Text {...c} name="university" label="University" />
            <Text {...c} name="college" label="College name" required />
            <Choice {...c} name="college_state" label="College state" options={[...OPT.college_state, ['__other', 'Other state']]}
              form={{ college_state: stateView }}
              set={(n, v) => {
                if (v === '__other') {
                  setOtherState(true)
                  set('college_state', '')
                } else {
                  setOtherState(false)
                  set('college_state', v)
                }
              }} />
            {otherState && (
              <div className="field full">
                <label htmlFor="f_state_other">Name of the state</label>
                <input id="f_state_other" disabled={readOnly} value={form.college_state ?? ''} onChange={(e) => set('college_state', e.target.value)} />
              </div>
            )}
            <Text {...c} name="college_district" label="College district" />
            <Text {...c} name="college_address" label="College address" textarea full />
          </div>
        )}

        {key === 'exam' && (
          <div className="form-grid">
            <Text {...c} name="last_exam" label="Last exam you wrote (for example Plus Two)" />
            <Text {...c} name="last_exam_year" label="Year" type="number" min="1990" inputMode="numeric" />
            <Text {...c} name="last_percentage" label="Percentage" type="number" min="0" max="100" step="0.01" inputMode="decimal" />
            <Text {...c} name="gpa" label="GPA / CGPA (only if grades are given)" inputMode="decimal" />
            <Choice {...c} name="has_backpapers" label="Do you have back papers?" options={OPT.yesno} />
            {form.has_backpapers === 'yes' && <Text {...c} name="backpaper_count" label="How many?" type="number" min="1" inputMode="numeric" />}
            <Text {...c} name="prev_qualification" label="Qualification before this course" />
            <Text {...c} name="prev_university" label="Board / university" />
            <Text {...c} name="prev_college" label="School / college" />
          </div>
        )}

        {key === 'expenses' && (
          <div className="form-grid">
            <Choice {...c} name="hosteller" label="Do you stay in a hostel?" options={OPT.yesno} />
            <Text {...c} name="tuition_fees" label="Tuition and other fees for one year (₹)" type="number" min="0" inputMode="numeric" />
            {form.hosteller === 'yes' && <Text {...c} name="hostel_fees" label="Hostel fees for one year (₹)" type="number" min="0" inputMode="numeric" />}
            <Text {...c} name="travel_expense" label="Travel cost for one year (₹)" type="number" min="0" inputMode="numeric" />
            <div className="field">
              <label htmlFor="f_total">Total for one year (₹)</label>
              <input id="f_total" readOnly value={form.expense_per_year ?? 0} />
              <p className="hint">Added up for you.</p>
            </div>
          </div>
        )}

        {key === 'scholarships' && (
          <div className="form-grid">
            <Choice {...c} name="wisdom_scholarship" label="Did you receive a Wisdom scholarship before?" options={OPT.yesno} />
            {form.wisdom_scholarship === 'yes' && <Text {...c} name="wisdom_scholarship_year" label="Which year(s)?" />}
            <Choice {...c} name="other_scholarship" label="Do you receive any other scholarship?" options={OPT.yesno} />
            {form.other_scholarship === 'yes' && (
              <>
                <Text {...c} name="other_scholarship_name" label="Scholarship name" />
                <Text {...c} name="other_scholarship_provider" label="Provided by" />
                <Text {...c} name="other_scholarship_amount" label="Amount per year (₹)" type="number" min="0" inputMode="numeric" />
              </>
            )}
          </div>
        )}

        {key === 'documents' && (
          <div className="stack" style={{ gap: '.9rem' }}>
            <p className="mt-0">Add these now, or later from the Documents page. You can submit the application first and add documents afterwards, but it is reviewed faster with them.</p>
            <UploadNote />
            {data.doc_types.map((type) => <Slot key={type.id} type={type} latest={latestDoc(type.id)} application={app} reload={reload} />)}
          </div>
        )}

        {key === 'review' && (
          <>
            <p className="mt-0">Check your answers. Use Change to correct anything, then submit.</p>
            {missing.length > 0 && (
              <div className="alert warn" role="alert">
                <div>
                  <strong>Please fill in before submitting:</strong>
                  <ul style={{ margin: '.4rem 0 0' }}>
                    {missing.map(([f, sec]) => (
                      <li key={f}>{LABELS[f]} <button type="button" className="link-btn" onClick={() => go(keys.indexOf(sec))}>Go to this question</button></li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            {Object.entries(REVIEW_GROUPS).map(([sec, fields]) => (
              <section key={sec} className="review-group">
                <div className="row spread">
                  <h3>{SECTIONS.find((s) => s.key === sec).title}</h3>
                  <button type="button" className="btn ghost small" onClick={() => go(keys.indexOf(sec))}>Change</button>
                </div>
                <dl className="kv-list">
                  {fields.filter((f) => String(form[f] ?? '') !== '').map((f) => (
                    <div key={f}><dt>{LABELS[f]}</dt><dd>{nice(f, form[f])}</dd></div>
                  ))}
                </dl>
              </section>
            ))}
            <section className="review-group">
              <div className="row spread">
                <h3>Documents</h3>
                <button type="button" className="btn ghost small" onClick={() => go(keys.indexOf('documents'))}>Change</button>
              </div>
              <ul className="plain">
                {data.doc_types.map((t) => <li key={t.id}>{t.label_en}: {latestDoc(t.id) ? 'added' : <span className="muted">not added yet</span>}</li>)}
              </ul>
            </section>
          </>
        )}
      </div>

      {error && <p className="alert error" role="alert">{error}</p>}
      <div className="row spread">
        <div className="row">
          <button className="btn outline" disabled={step === 0} onClick={() => go(step - 1)}>Back</button>
          {step < keys.length - 1 && <button className="btn" onClick={() => go(step + 1)}>Next</button>}
          {key === 'review' && !readOnly && (
            <button className="btn accent" disabled={busy || missing.length > 0} onClick={submit}>{busy && <span className="spinner" />}Submit application</button>
          )}
        </div>
        {!readOnly && <span className="muted small" role="status">{savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : 'Your answers are saved as you go'}</span>}
      </div>
    </div>
  )
}

export default function ApplicationForm() {
  const { data, reload } = useAppData()
  if (!data.application) {
    return (
      <div className="card">
        <p>{data.open_cycle ? 'You have not started an application yet.' : 'Applications are closed right now.'}</p>
        <Link className="btn" to="/">Back</Link>
      </div>
    )
  }
  return <Form data={data} reload={reload} />
}
