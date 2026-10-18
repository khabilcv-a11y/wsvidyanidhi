import { useState } from 'react'
import { call } from '@shared/lib/api.js'
import { DISTRICTS } from '@shared/lib/constants.js'
import { label, monthName, options, rupees } from '@shared/lib/labels.js'
import { Done, ErrorNote, Input, Select, useAction, useMeta } from '../ui.jsx'

const kv = (rows) => rows.map(([k, v]) => (
  <tr key={k}><th scope="row">{k}</th><td>{v === '' || v === null || v === undefined ? <span className="muted">—</span> : String(v)}</td></tr>
))

function EditForm({ data, reload, onClose }) {
  const meta = useMeta()
  const { application: a, applicant: p } = data
  const [f, setF] = useState({
    phone: p.phone, whatsapp: p.whatsapp, district: p.district, address: p.address, guardian_name: p.guardian_name, guardian_phone: p.guardian_phone,
    course: a.course, subject: a.subject, category: a.category, stream: a.stream, course_type: a.course_type, year_of_study: a.year_of_study,
    completion_month: a.completion_month, university: a.university, college: a.college,
    referred_by: a.referred_by, referrer_designation: a.referrer_designation, referrer_zone: a.referrer_zone, referrer_contact: a.referrer_contact,
  })
  const [reason, setReason] = useState('')
  const [st, run] = useAction()
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }))
  const APPLICANT = ['phone', 'whatsapp', 'district', 'address', 'guardian_name', 'guardian_phone']

  async function save(e) {
    e.preventDefault()
    const applicant = Object.fromEntries(APPLICANT.map((k) => [k, f[k]]))
    const application = Object.fromEntries(Object.keys(f).filter((k) => !APPLICANT.includes(k)).map((k) => [k, f[k]]))
    if (await run(() => call('admin.app.edit', { id: a.id, applicant, application, reason }))) {
      await reload()
      onClose()
    }
  }

  return (
    <form className="card tint" onSubmit={save}>
      <h3>Correct details (old values are kept in the history)</h3>
      <div className="form-grid">
        <Input id="e_phone" label="Mobile" value={f.phone} onChange={set('phone')} />
        <Input id="e_wa" label="WhatsApp" value={f.whatsapp} onChange={set('whatsapp')} />
        <Select id="e_dist" label="Native district" value={f.district} onChange={set('district')} options={DISTRICTS.map((d) => [d, d])} />
        <Input id="e_gn" label="Guardian" value={f.guardian_name} onChange={set('guardian_name')} />
        <Input id="e_gp" label="Guardian phone" value={f.guardian_phone} onChange={set('guardian_phone')} />
        <Input id="e_course" label="Course" value={f.course} onChange={set('course')} />
        <Input id="e_subject" label="Subject" value={f.subject} onChange={set('subject')} />
        <Select id="e_cat" label="Category" value={f.category} onChange={set('category')} options={options('category')} />
        <Select id="e_stream" label="Stream" value={f.stream} onChange={set('stream')} options={(meta?.streams || []).map((s) => [s, s])} />
        <Select id="e_ct" label="Institution type" value={f.course_type} onChange={set('course_type')} options={options('course_type')} />
        <Input id="e_year" label="Year of study" type="number" value={f.year_of_study} onChange={set('year_of_study')} />
        <Input id="e_end" label="Course ends (month)" type="month" value={f.completion_month} onChange={set('completion_month')} />
        <Input id="e_uni" label="University" value={f.university} onChange={set('university')} />
        <Input id="e_col" label="College" value={f.college} onChange={set('college')} />
        <Input id="e_rb" label="Referred by" value={f.referred_by} onChange={set('referred_by')} />
        <Input id="e_rd" label="Referrer designation" value={f.referrer_designation} onChange={set('referrer_designation')} />
        <Input id="e_rz" label="Referrer zone or district" value={f.referrer_zone} onChange={set('referrer_zone')} />
        <Input id="e_rc" label="Referrer contact" value={f.referrer_contact} onChange={set('referrer_contact')} />
        <div className="full"><Input id="e_reason" label="Reason for the correction" value={reason} onChange={setReason} /></div>
      </div>
      <ErrorNote>{st.error}</ErrorNote>
      <div className="row">
        <button className="btn" disabled={st.busy}>Save corrections</button>
        <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
      </div>
    </form>
  )
}

export default function OverviewTab({ data, reload }) {
  const { application: a, applicant: p } = data
  const [editing, setEditing] = useState(false)
  const [claimEmail, setClaimEmail] = useState('')
  const [st, run] = useAction()

  return (
    <div className="stack">
      {p.legacy && (
        <div className="card sun">
          <h3>Imported record</h3>
          <p>This record was imported and is not linked to an account yet. Enter the scholar's email so the record links when they sign in with it.</p>
          <form className="row" onSubmit={(e) => { e.preventDefault(); run(() => call('admin.legacy.email', { application_id: a.id, email: claimEmail }), 'Saved.') }}>
            <div className="field grow mb-0"><label htmlFor="ce">Scholar's email</label><input id="ce" type="email" required value={claimEmail} onChange={(e) => setClaimEmail(e.target.value)} /></div>
            <button className="btn" disabled={st.busy}>Save</button>
          </form>
          <ErrorNote>{st.error}</ErrorNote><Done>{st.done}</Done>
        </div>
      )}
      <div className="row spread">
        <p className="muted mb-0">Scheme {a.scheme_year || '—'}{a.wisdom_district ? ` · ${a.wisdom_district}` : ''}</p>
        {!editing && <button className="btn outline small" onClick={() => setEditing(true)}>Correct details</button>}
      </div>
      {editing && <EditForm data={data} reload={reload} onClose={() => setEditing(false)} />}
      <div className="grid cols-2">
        <section className="card" aria-labelledby="ap-h">
          <h2 id="ap-h">Applicant</h2>
          <div className="table-wrap"><table className="kv"><tbody>
            {kv([['Gender', p.gender], ['Date of birth', p.dob], ['Native district', p.district], ['Address', p.address], ['Mobile', p.phone],
              ['WhatsApp', p.whatsapp], ['Guardian', p.guardian_name], ['Guardian phone', p.guardian_phone],
              ['Guardian occupation', p.guardian_occupation], ['Family income', p.family_income === null ? '' : rupees(p.family_income)]])}
          </tbody></table></div>
        </section>
        <section className="card" aria-labelledby="co-h">
          <h2 id="co-h">Course</h2>
          <div className="table-wrap"><table className="kv"><tbody>
            {kv([['Course', a.course], ['Subject', a.subject], ['Category', a.category ? label('category', a.category) : ''],
              ['Stream', a.stream], ['Institution type', a.course_type ? label('course_type', a.course_type) : ''],
              ['Year of study', a.year_of_study], ['Course ends', monthName(a.completion_month)], ['University', a.university],
              ['College', a.college], ['Last exam', a.last_exam], ['Exam year', a.last_exam_year], ['Percentage', a.last_percentage]])}
          </tbody></table></div>
        </section>
      </div>
      <section className="card" aria-labelledby="ref-h">
        <h2 id="ref-h">Recommended by</h2>
        <div className="table-wrap"><table className="kv"><tbody>
          {kv([['Name', a.referred_by], ['Designation', a.referrer_designation], ['Zone or district', a.referrer_zone], ['Contact', a.referrer_contact]])}
        </tbody></table></div>
      </section>
    </div>
  )
}
