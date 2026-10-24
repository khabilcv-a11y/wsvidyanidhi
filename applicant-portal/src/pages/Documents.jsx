import { useCallback, useState } from 'react'
import { Link } from 'react-router-dom'
import { call, fileToBase64 } from '@shared/lib/api.js'
import { useI18n } from '@shared/lib/i18n.jsx'
import { DOC_STATUS } from '@shared/lib/constants.js'
import DocViewer from '@shared/components/DocViewer.jsx'
import { prepareFile } from '../lib/files.js'
import { useAppData } from './AppData.jsx'
import { DOC_HELP_ML, SHOW_ML_HELP, UPLOAD_NOTE, UPLOAD_NOTE_ML } from '../lib/sections.js'

export function Slot({ type, latest, application, reload }) {
  const { t, lang } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [viewing, setViewing] = useState(false)
  const label = lang === 'ml' ? type.label_ml : type.label_en
  const canUpload = ['draft', 'submitted', 'documents_requested'].includes(application.status) && latest?.status !== 'accepted'
  const inputId = `file_${type.id}`
  const load = useCallback(() => call('doc.file', { id: latest.id }), [latest])

  async function onPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const ready = await prepareFile(file)
      await call('doc.upload', {
        application_id: application.id, doc_type_id: type.id, mime: ready.type, data: await fileToBase64(ready),
      })
      await reload()
    } catch (ex) {
      setError(ex.message)
    } finally {
      setBusy(false)
    }
  }

  const st = latest ? DOC_STATUS[latest.status] : null
  return (
    <div className="card">
      <div className="row spread">
        <div className="grow">
          <h2 style={{ fontSize: '1.1rem' }} className="mb-0">{label}</h2>
          {SHOW_ML_HELP && DOC_HELP_ML[type.code] && (
            <details className="ml-help"><summary lang="ml">മലയാളത്തിൽ അറിയാൻ</summary><p lang="ml" className="help">{DOC_HELP_ML[type.code]}</p></details>
          )}
          <p className="mb-0" style={{ marginTop: '.4rem' }}>
            {st ? <span className={`badge ${st.tone}`}>{st[lang]}{latest.version > 1 ? ` · v${latest.version}` : ''}</span>
              : <span className="badge">{t('notUploaded')}</span>}
          </p>
          {latest?.status === 'reupload' && latest.reason && (
            <p className="alert error" style={{ marginTop: '.75rem', marginBottom: 0 }}><span>{latest.reason}</span></p>
          )}
        </div>
        <div className="row" style={{ gap: '.5rem' }}>
          {latest && <button className="btn ghost small" onClick={() => setViewing(true)}>{t('view')}</button>}
          {canUpload && (
            <>
              <input id={inputId} className="visually-hidden" type="file" accept="image/jpeg,image/png,application/pdf"
                disabled={busy} onChange={onPick} />
              <label htmlFor={inputId} className={`btn small ${latest ? 'outline' : 'accent'}`} aria-disabled={busy}>
                {busy && <span className="spinner" />}{latest ? t('uploadAgain') : t('upload')}
                <span className="visually-hidden">: {label}</span>
              </label>
            </>
          )}
        </div>
      </div>
      {error && <p className="alert error" role="alert" style={{ marginTop: '.75rem', marginBottom: 0 }}>{error}</p>}
      {viewing && <DocViewer title={label} load={load} onClose={() => setViewing(false)} />}
    </div>
  )
}

export function UploadNote() {
  return (
    <div className="upload-note">
      <p className="mt-0">{UPLOAD_NOTE}</p>
      {SHOW_ML_HELP && <details className="ml-help"><summary lang="ml">മലയാളത്തിൽ അറിയാൻ</summary><p lang="ml" className="help">{UPLOAD_NOTE_ML}</p></details>}
    </div>
  )
}

export default function Documents() {
  const { t } = useI18n()
  const { data, reload } = useAppData()
  const app = data.application
  const [sending, setSending] = useState(false)
  const [error, setError] = useState(null)

  if (!app) {
    return (
      <div className="card">
        <p>{t('startApplication')}</p>
        <Link className="btn" to="/">{t('dashboard')}</Link>
      </div>
    )
  }
  const latestOf = (id) => data.docs.find((d) => d.doc_type_id === id) // newest version first
  const resubmittable = app.status === 'documents_requested' && data.pending.length === 0

  async function send() {
    setSending(true)
    setError(null)
    try {
      await call('app.resubmit', { id: app.id })
      await reload()
    } catch (e) {
      setError(e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="stack">
      <div className="page-title"><h1>{t('documents')}</h1></div>
      <p className="muted mt-0">{t('docHelp')}</p>
      <UploadNote />
      {data.doc_types.map((type) => (
        <Slot key={type.id} type={type} latest={latestOf(type.id)} application={app} reload={reload} />
      ))}
      {resubmittable && (
        <div className="card tint">
          <p>{t('sendForReviewText')}</p>
          <button className="btn accent" disabled={sending} onClick={send}>{t('sendForReview')}</button>
          {error && <p className="alert error" role="alert" style={{ marginTop: '1rem' }}>{error}</p>}
        </div>
      )}
    </div>
  )
}
