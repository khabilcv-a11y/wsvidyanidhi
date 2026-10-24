import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { call } from '@shared/lib/api.js'
import { DISTRICTS } from '@shared/lib/constants.js'
import { EDITABLE, useAppData } from './AppData.jsx'
import { Slot, UploadNote, filesOf } from './Documents.jsx'
import { Choice, Select, Text } from '../components/form.jsx'
import { Backpapers, ChoiceOther, Combo, DatePick, MultiChoice, PinLookup, WhatsApp, YearChoice } from '../components/fields.jsx'
import { LABELS, REQUIRED, REVIEW_GROUPS, SECTIONS, SELECT_OPTIONS as OPT, display } from '../lib/sections.js'
import {
  BOARDS, COURSES, EXAM_LEVELS, KERALA_DISTRICTS, OTHER_SCHOLARSHIPS, PREV_QUALIFICATIONS, PROVIDER_TYPES, STATES, SUBJECTS,
  UNIVERSITIES_EXTRA, WISDOM_YEARS,
} from '../lib/lists.js'

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
  'category_other', 'stream_other', 'exam_level', 'exam_level_other', 'backpapers',
  'prev_qualification_other', 'other_scholarship_type', 'other_scholarship_type_other',
]
const COST_FIELDS = ['tuition_fees', 'hostel_fees', 'travel_expense']
const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k] ?? '']))

// The "last exam" column used by the committee screens is filled in from the exam level the applicant chose.
const lastExamText = (f) => (f.exam_level === 'others' ? f.exam_level_other || '' : (EXAM_LEVELS.find((e) => e[0] === f.exam_level) || [])[1] || '')

export function docsSummary(data) {
  return data.doc_types.map((t) => ({ label: t.label_en, files: filesOf(data.docs, t.id) }))
}

function useUniversities() {
  const [list, setList] = useState(UNIVERSITIES_EXTRA)
  useEffect(() => {
    let live = true
    fetch('/data/universities.json')
      .then((r) => r.json())
      .then((all) => live && setList([...new Set([...UNIVERSITIES_EXTRA, ...all])]))
      .catch(() => {})
    return () => { live = false }
  }, [])
  return list
}

export function DownloadButton({ form, application, data, className = 'btn outline' }) {
  const [busy, setBusy] = useState(false)
  async function go() {
    setBusy(true)
    try {
      const { downloadApplication } = await import('../lib/pdf.js')
      await downloadApplication({ form, application, docs: docsSummary(data), submitted: application.status !== 'draft' })
    } finally {
      setBusy(false)
    }
  }
  return <button type="button" className={className} disabled={busy} onClick={go}>{busy && <span className="spinner" />}Download my application (PDF)</button>
}

function Form({ data, reload }) {
  const app = data.application
  const readOnly = !EDITABLE.includes(app.status)
  const universities = useUniversities()
  const [form, setForm] = useState(() => ({ ...(data.applicant ?? {}), ...app }))
  const [step, setStep] = useState(0)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
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
      if (k === 'phone' && (!f.whatsapp || f.whatsapp === f.phone)) next.whatsapp = v
      return next
    })
  }

  const save = useCallback(async () => {
    const f = { ...latest.current }
    f.last_exam = lastExamText(f)
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

  // Save when the page is closed or the phone switches app, so nothing typed is lost
  useEffect(() => {
    const flush = () => { if (dirty.current && !readOnly) save().catch(() => {}) }
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
    }
  }, [readOnly, save])

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
  const keralaCollege = String(form.college_state || '').toLowerCase() === 'kerala'

  if (readOnly && app.status !== 'draft') {
    return (
      <div className="stack">
        <div className="card done-card">
          <p className="eyebrow">Application received</p>
          <h1 style={{ fontSize: '1.7rem' }}>Thank you, {String(form.full_name || '').split(' ')[0] || 'applicant'}.</h1>
          <p>Your application number is</p>
          <p className="big-no">{app.application_no}</p>
          <p>Please note it down. Next time, open <strong>Continue or check status</strong> and enter this number with your mobile number to see where your application stands.</p>
          <div className="row">
            <Link className="btn accent" to="/">See my application status</Link>
            <Link className="btn outline" to="/documents">Add or replace documents</Link>
            <DownloadButton form={form} application={app} data={data} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="stack" ref={top}>
      <div className="page-title">
        <h1>Application</h1>
        <span className="badge sun">Application number: {app.application_no}</span>
      </div>
      <p className="muted mt-0">Write your application number down. You can stop at any time and come back: everything you enter is saved.</p>

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
            <Choice {...c} name="gender" label="Gender" options={OPT.gender} required />
            <DatePick {...c} name="dob" label="Date of birth" required />
            <Text {...c} name="phone" label="Mobile number" type="tel" inputMode="numeric" required autoComplete="tel" />
            <WhatsApp {...c} />
            <Text {...c} name="email" label="Email (optional)" type="email" autoComplete="email" full />
            <h3 className="sub full">Address</h3>
            <Text {...c} name="address" label="House name and address" textarea full autoComplete="street-address" />
            <Text {...c} name="native_place" label="Place" />
            <PinLookup {...c} />
            <Select {...c} name="district" label="Native district" options={DISTRICTS} required />
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
            <h3 className="sub full">Your course</h3>
            <ChoiceOther {...c} name="category" label="Course category" options={OPT.category} />
            <Combo {...c} name="course" label="Course" options={COURSES} required hint="Start typing to see suggestions, or type your own." />
            <Combo {...c} name="subject" label="Main subject" options={SUBJECTS} />
            <ChoiceOther {...c} name="stream" otherValue="Others" label="Field of study" options={OPT.stream} />
            <Choice {...c} name="duration_years" label="Course duration (years)" options={OPT.duration_years} />
            <Choice {...c} name="year_of_study" label="Current year of study" options={OPT.year_of_study} />
            <Text {...c} name="completion_month" label="Course ends in (month and year)" type="month" />
            <h3 className="sub full">Your college</h3>
            <Combo {...c} name="college_state" label="College state" options={STATES} />
            {keralaCollege ? (
              <Select {...c} name="college_district" label="College district" options={KERALA_DISTRICTS} />
            ) : (
              <Text {...c} name="college_district" label="College district / city" />
            )}
            <Text {...c} name="college" label="College name" required full />
            <Choice {...c} name="course_type" label="Type of college" options={OPT.course_type} />
            <Combo {...c} name="university" label="University" options={universities} full />
            <Text {...c} name="college_address" label="College address" textarea full />
          </div>
        )}

        {key === 'exam' && (
          <div className="form-grid">
            <h3 className="sub full">Your last exam</h3>
            <ChoiceOther {...c} name="exam_level" label="Which exam was it?" options={EXAM_LEVELS} />
            <YearChoice {...c} name="last_exam_year" label="Year you wrote it" />
            <Text {...c} name="last_percentage" label="Percentage of marks" type="number" min="0" max="100" step="0.01" inputMode="decimal" />
            <Text {...c} name="gpa" label="GPA / CGPA (only if grades are given)" inputMode="decimal" />
            <h3 className="sub full">Back papers</h3>
            <Choice {...c} name="has_backpapers" label="Do you have any pending (back) papers?" options={OPT.yesno} />
            {form.has_backpapers === 'yes' && <Backpapers {...c} />}
            <h3 className="sub full">Before this course</h3>
            <ChoiceOther {...c} name="prev_qualification" label="What did you complete before this course?" options={PREV_QUALIFICATIONS} />
            <Combo {...c} name="prev_university" label="Board or university" options={[...BOARDS, ...universities]} />
            <Text {...c} name="prev_college" label="School or college" />
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
            <Choice {...c} name="wisdom_scholarship" label="Did you receive a Wisdom Vidyanidhi scholarship before?" options={OPT.yesno} />
            {form.wisdom_scholarship === 'yes' && <MultiChoice {...c} name="wisdom_scholarship_year" label="Which year(s)?" options={WISDOM_YEARS} />}
            <Choice {...c} name="other_scholarship" label="Do you receive any other scholarship now?" options={OPT.yesno} />
            {form.other_scholarship === 'yes' && (
              <>
                <ChoiceOther {...c} name="other_scholarship_type" label="Who gives it?" options={PROVIDER_TYPES} />
                <Combo {...c} name="other_scholarship_name" label="Scholarship name" options={OTHER_SCHOLARSHIPS} full />
                <Text {...c} name="other_scholarship_provider" label="Office or organisation (optional)" />
                <Text {...c} name="other_scholarship_amount" label="Amount per year (₹)" type="number" min="0" inputMode="numeric" />
              </>
            )}
          </div>
        )}

        {key === 'documents' && (
          <div className="stack" style={{ gap: '.9rem' }}>
            <p className="mt-0">Add your documents now. You can also submit first and add them later from the Documents page, but your application is reviewed faster with them.</p>
            <UploadNote />
            {data.doc_types.map((type) => <Slot key={type.id} type={type} files={filesOf(data.docs, type.id)} application={app} reload={reload} />)}
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
                    <div key={f}><dt>{LABELS[f]}</dt><dd>{display(f, form)}</dd></div>
                  ))}
                </dl>
                {sec === 'exam' && form.backpapers && (
                  <ul className="plain">{String(form.backpapers).split('\n').filter(Boolean).map((r) => { const [s, m] = r.split('|'); return <li key={r}>{s} (semester {m || '-'})</li> })}</ul>
                )}
              </section>
            ))}
            <section className="review-group">
              <div className="row spread">
                <h3>Documents</h3>
                <button type="button" className="btn ghost small" onClick={() => go(keys.indexOf('documents'))}>Change</button>
              </div>
              <ul className="plain">
                {data.doc_types.map((t) => {
                  const n = filesOf(data.docs, t.id).filter((f) => f.status !== 'reupload').length
                  return <li key={t.id}>{t.label_en}: {n ? `${n} file${n > 1 ? 's' : ''} added` : <span className="muted">not added yet</span>}</li>
                })}
              </ul>
            </section>
            <p style={{ marginTop: '1.2rem' }}><DownloadButton form={form} application={app} data={data} /></p>
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
