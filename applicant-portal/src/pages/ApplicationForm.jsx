import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { call } from '@shared/lib/api.js'
import { useI18n } from '@shared/lib/i18n.jsx'
import { DISTRICTS } from '@shared/lib/constants.js'
import { EDITABLE, useAppData } from './AppData.jsx'

const APPLICANT_FIELDS = [
  'full_name', 'gender', 'dob', 'district', 'address', 'phone', 'whatsapp',
  'guardian_name', 'guardian_phone', 'guardian_occupation', 'family_income',
  'native_place', 'post_office', 'pin_code',
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
const pick = (obj, keys) => Object.fromEntries(keys.map((k) => [k, obj[k] ?? '']))

function Field({ name, label, form, set, disabled, required, type = 'text', options, hint, ...rest }) {
  const { t } = useI18n()
  const id = `f_${name}`
  return (
    <div className="field">
      <label htmlFor={id}>{label}{required && <span className="req" aria-hidden="true"> *</span>}</label>
      {options ? (
        <select id={id} disabled={disabled} required={required} value={form[name] ?? ''} onChange={(e) => set(name, e.target.value)}>
          <option value="">{t('select')}</option>
          {options.map((o) => {
            const [value, text] = Array.isArray(o) ? o : [o, o]
            return <option key={value} value={value}>{text}</option>
          })}
        </select>
      ) : (
        <input id={id} type={type} disabled={disabled} required={required} value={form[name] ?? ''}
          aria-describedby={hint ? `${id}_h` : undefined} onChange={(e) => set(name, e.target.value)} {...rest} />
      )}
      {hint && <p className="hint" id={`${id}_h`}>{hint}</p>}
    </div>
  )
}

function Form({ data, reload }) {
  const { t } = useI18n()
  const app = data.application
  const readOnly = !EDITABLE.includes(app.status)
  const [form, setForm] = useState(() => ({ ...(data.applicant ?? {}), ...app }))
  const [step, setStep] = useState(0)
  const [savedAt, setSavedAt] = useState(null)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const dirty = useRef(false)
  const latest = useRef(form)
  useEffect(() => {
    latest.current = form
  }, [form])

  const set = (k, v) => {
    dirty.current = true
    setForm((f) => {
      const next = { ...f, [k]: v }
      if (['tuition_fees', 'hostel_fees', 'travel_expense'].includes(k)) {
        next.expense_per_year = ['tuition_fees', 'hostel_fees', 'travel_expense'].reduce((n, x) => n + (Number(next[x]) || 0), 0)
      }
      return next
    })
  }

  const save = useCallback(async () => {
    const f = latest.current
    await call('app.save', {
      id: app.id,
      applicant: pick(f, APPLICANT_FIELDS),
      application: pick(f, APPLICATION_FIELDS),
    })
    dirty.current = false
    setSavedAt(new Date())
  }, [app.id])

  // Save 2 seconds after the last edit
  useEffect(() => {
    if (readOnly || !dirty.current) return undefined
    const id = setTimeout(() => save().catch((e) => setError(e.message)), 2000)
    return () => clearTimeout(id)
  }, [form, readOnly, save])

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
  }

  const steps = [t('stepPersonal'), t('stepGuardian'), t('stepCourse'), t('stepExam'), t('stepExpenses'), t('stepScholarships'), t('stepReview')]
  const yn = [['yes', t('yes')], ['no', t('no')]]
  const c = { form, set, disabled: readOnly }

  return (
    <div className="stack">
      <div className="page-title">
        <h1>{t('application')}</h1>
        {app.application_no && <span className="badge sun">{t('applicationNo')}: {app.application_no}</span>}
      </div>
      {readOnly && (
        <p className="alert">{t('submittedLocked')} <Link to="/documents">{t('documents')}</Link></p>
      )}

      <ol className="tracker" aria-label={t('progress')}>
        {steps.map((s, i) => (
          <li key={s} className={i < step ? 'done' : i === step ? 'now' : ''} aria-current={i === step ? 'step' : undefined}>{s}</li>
        ))}
      </ol>

      <div className="card">
        <h2 className="visually-hidden">{steps[step]}</h2>
        {step === 0 && (
          <div className="form-grid">
            <Field {...c} name="full_name" label={t('fullName')} required autoComplete="name" />
            <Field {...c} name="gender" label={t('gender')} options={[['male', t('male')], ['female', t('female')], ['other', t('other')]]} />
            <Field {...c} name="dob" label={t('dob')} type="date" required autoComplete="bday" />
            <Field {...c} name="district" label={t('district')} options={DISTRICTS} required />
            <Field {...c} name="native_place" label={t('nativePlace')} />
            <Field {...c} name="phone" label={t('phone')} type="tel" inputMode="tel" required autoComplete="tel" />
            <Field {...c} name="whatsapp" label={t('whatsapp')} type="tel" inputMode="tel" />
            <div className="field full">
              <label htmlFor="f_address">{t('address')}</label>
              <textarea id="f_address" rows={3} disabled={readOnly} value={form.address ?? ''} autoComplete="street-address"
                onChange={(e) => set('address', e.target.value)} />
            </div>
            <Field {...c} name="post_office" label={t('postOffice')} />
            <Field {...c} name="pin_code" label={t('pinCode')} inputMode="numeric" maxLength={6} pattern="[0-9]{6}" />
          </div>
        )}
        {step === 1 && (
          <div className="form-grid">
            <Field {...c} name="guardian_name" label={t('guardianName')} required />
            <Field {...c} name="guardian_phone" label={t('guardianPhone')} type="tel" inputMode="tel" />
            <Field {...c} name="guardian_occupation" label={t('guardianOccupation')} />
            <Field {...c} name="family_income" label={t('income')} type="number" min="0" inputMode="numeric" />
          </div>
        )}
        {step === 2 && (
          <div className="form-grid">
            <Field {...c} name="category" label={t('courseCategory')}
              options={[['ug', t('ug')], ['pg', t('pg')], ['diploma', t('diploma')], ['others', t('otherCat')]]} />
            <Field {...c} name="course" label={t('course')} required />
            <Field {...c} name="subject" label={t('subject')} />
            <Field {...c} name="course_type" label={t('courseType')}
              options={[['self_financing', t('selfFinancing')], ['aided', t('aided')], ['government', t('government')]]} />
            <Field {...c} name="stream" label={t('stream')} />
            <Field {...c} name="duration_years" label={t('duration')} type="number" min="0" step="0.5" />
            <Field {...c} name="year_of_study" label={t('yearOfStudy')} type="number" min="1" />
            <Field {...c} name="completion_month" label={t('completionMonth')} type="month" />
            <Field {...c} name="university" label={t('university')} />
            <Field {...c} name="college" label={t('college')} required />
            <Field {...c} name="college_state" label={t('collegeState')} />
            <Field {...c} name="college_district" label={t('collegeDistrict')} />
            <div className="field full">
              <label htmlFor="f_college_address">{t('collegeAddress')}</label>
              <textarea id="f_college_address" rows={2} disabled={readOnly} value={form.college_address ?? ''}
                onChange={(e) => set('college_address', e.target.value)} />
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="form-grid">
            <Field {...c} name="last_exam" label={t('lastExam')} />
            <Field {...c} name="last_exam_year" label={t('lastExamYear')} type="number" min="1990" />
            <Field {...c} name="last_percentage" label={t('lastPercentage')} type="number" min="0" max="100" step="0.01" />
            <Field {...c} name="gpa" label={t('gpa')} inputMode="decimal" />
            <Field {...c} name="has_backpapers" label={t('hasBackpapers')} options={yn} />
            {form.has_backpapers === 'yes' && <Field {...c} name="backpaper_count" label={t('backpaperCount')} type="number" min="1" />}
            <Field {...c} name="prev_qualification" label={t('prevQualification')} />
            <Field {...c} name="prev_university" label={t('prevUniversity')} />
            <Field {...c} name="prev_college" label={t('prevCollege')} />
          </div>
        )}
        {step === 4 && (
          <div className="form-grid">
            <Field {...c} name="hosteller" label={t('hosteller')} options={yn} />
            <Field {...c} name="tuition_fees" label={t('tuitionFees')} type="number" min="0" inputMode="numeric" />
            {form.hosteller === 'yes' && <Field {...c} name="hostel_fees" label={t('hostelFees')} type="number" min="0" inputMode="numeric" />}
            <Field {...c} name="travel_expense" label={t('travelExpense')} type="number" min="0" inputMode="numeric" />
            <div className="field">
              <label htmlFor="f_total">{t('expenseTotal')}</label>
              <input id="f_total" readOnly value={form.expense_per_year ?? 0} />
            </div>
          </div>
        )}
        {step === 5 && (
          <div className="form-grid">
            <Field {...c} name="wisdom_scholarship" label={t('wisdomScholarship')} options={yn} />
            {form.wisdom_scholarship === 'yes' && <Field {...c} name="wisdom_scholarship_year" label={t('wisdomScholarshipYear')} />}
            <Field {...c} name="other_scholarship" label={t('otherScholarship')} options={yn} />
            {form.other_scholarship === 'yes' && (
              <>
                <Field {...c} name="other_scholarship_name" label={t('otherScholarshipName')} />
                <Field {...c} name="other_scholarship_provider" label={t('otherScholarshipProvider')} />
                <Field {...c} name="other_scholarship_amount" label={t('otherScholarshipAmount')} type="number" min="0" inputMode="numeric" />
              </>
            )}
          </div>
        )}
        {step === 6 && (
          <>
            <p>{t('reviewLead')}</p>
            <div className="table-wrap">
              <table className="kv">
                <tbody>
                  {[...APPLICANT_FIELDS, ...APPLICATION_FIELDS].map((k) => (
                    <tr key={k}><th scope="row">{k.replaceAll('_', ' ')}</th><td>{form[k] || <span className="muted">—</span>}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {error && <p className="alert error" role="alert">{error}</p>}
      <div className="row spread">
        <div className="row">
          <button className="btn outline" disabled={step === 0} onClick={() => go(step - 1)}>{t('back')}</button>
          {step < steps.length - 1 && <button className="btn" onClick={() => go(step + 1)}>{t('next')}</button>}
          {step === steps.length - 1 && !readOnly && (
            <button className="btn accent" disabled={busy} onClick={submit}>{busy && <span className="spinner" />}{t('submit')}</button>
          )}
        </div>
        {!readOnly && <span className="muted small" role="status">{savedAt ? `${t('saved')} ${savedAt.toLocaleTimeString()}` : ''}</span>}
      </div>
    </div>
  )
}

export default function ApplicationForm() {
  const { t } = useI18n()
  const { data, reload } = useAppData()
  if (!data.application) {
    return (
      <div className="card">
        <p>{data.open_cycle ? t('startApplication') : t('closed')}</p>
        <Link className="btn" to="/">{t('dashboard')}</Link>
      </div>
    )
  }
  return <Form data={data} reload={reload} />
}
