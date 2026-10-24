import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { call, fileToBase64 } from '@shared/lib/api.js'
import { useI18n } from '@shared/lib/i18n.jsx'
import { DOC_STATUS } from '@shared/lib/constants.js'
import DocViewer from '@shared/components/DocViewer.jsx'
import { prepareFile } from '../lib/files.js'
import { DOC_HELP_ML, SHOW_ML_HELP, UPLOAD_NOTE, UPLOAD_NOTE_ML } from '../lib/sections.js'
import { useAppData } from './AppData.jsx'

export const MAX_FILES = 3
export const fmtSize = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`)

function FileRow({ doc, index, canEdit, onView, onRemove, busy }) {
  const st = DOC_STATUS[doc.status]
  return (
    <li className="file-row">
      <div className="grow">
        <strong>File {index + 1}</strong> <span className="muted small">{doc.size ? fmtSize(doc.size) : ''}</span>
        <div>{st && <span className={`badge ${st.tone}`}>{st.en}</span>}</div>
        {doc.status === 'reupload' && doc.reason && <p className="alert error" style={{ margin: '.5rem 0 0' }}><span>{doc.reason}</span></p>}
      </div>
      <div className="row" style={{ gap: '.4rem' }}>
        <button type="button" className="btn ghost small" onClick={onView}>View</button>
        {canEdit && doc.status !== 'accepted' && <button type="button" className="btn ghost small" disabled={busy} onClick={onRemove}>Remove</button>}
      </div>
    </li>
  )
}

// Choosing a file shows a preview first, and only uploads when the applicant confirms.
function Picked({ file, onUpload, onCancel, busy }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  const isPdf = file.type === 'application/pdf'
  return (
    <div className="picked">
      {isPdf ? <div className="pdf-icon" aria-hidden="true">PDF</div> : url && <img src={url} alt="Preview of the chosen file" />}
      <div className="grow">
        <strong>{file.name}</strong>
        <div className="muted small">{fmtSize(file.size)} · {isPdf ? 'PDF' : 'Photo'}</div>
        <p className="small mb-0">Check that the whole document is visible and easy to read.</p>
        <div className="row" style={{ marginTop: '.6rem' }}>
          <button type="button" className="btn accent small" disabled={busy} onClick={onUpload}>{busy && <span className="spinner" />}Upload this file</button>
          <button type="button" className="btn ghost small" disabled={busy} onClick={onCancel}>Choose another</button>
        </div>
      </div>
    </div>
  )
}

export function Slot({ type, files, application, reload }) {
  const { lang } = useI18n()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [picked, setPicked] = useState(null)
  const label = lang === 'ml' ? type.label_ml : type.label_en
  const editable = ['draft', 'submitted', 'documents_requested'].includes(application.status)
  const kept = files.filter((f) => f.status !== 'reupload')
  const accepted = files.some((f) => f.status === 'accepted')
  const canAdd = editable && !accepted && kept.length < MAX_FILES
  const id = `file_${type.id}`

  async function onPick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    try {
      setPicked(await prepareFile(file))
    } catch (ex) {
      setError(ex.message)
    }
  }

  async function upload() {
    setBusy(true)
    setError(null)
    try {
      await call('doc.upload', { application_id: application.id, doc_type_id: type.id, mime: picked.type, data: await fileToBase64(picked) })
      setPicked(null)
      await reload()
    } catch (ex) {
      setError(ex.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(doc) {
    setBusy(true)
    setError(null)
    try {
      await call('doc.remove', { id: doc.id })
      await reload()
    } catch (ex) {
      setError(ex.message)
    } finally {
      setBusy(false)
    }
  }

  const load = useCallback(() => call('doc.file', { id: viewing.id }), [viewing])
  const complete = kept.length > 0
  return (
    <div className="card doc-card">
      <div className="row spread">
        <div className="grow">
          <h2 style={{ fontSize: '1.1rem' }} className="mb-0">{label}</h2>
          <p className="mb-0" style={{ marginTop: '.3rem' }}>
            <span className={`badge ${complete ? 'ok' : ''}`}>{complete ? `${kept.length} of ${MAX_FILES} files added` : 'Not added yet'}</span>
          </p>
          {SHOW_ML_HELP && DOC_HELP_ML[type.code] && (
            <details className="ml-help"><summary lang="ml">മലയാളത്തിൽ അറിയാൻ</summary><p lang="ml" className="help">{DOC_HELP_ML[type.code]}</p></details>
          )}
        </div>
      </div>

      {files.length > 0 && (
        <ul className="plain file-list">
          {files.map((f, i) => (
            <FileRow key={f.id} doc={f} index={i} canEdit={editable} busy={busy} onView={() => setViewing(f)} onRemove={() => remove(f)} />
          ))}
        </ul>
      )}

      {picked ? (
        <Picked file={picked} busy={busy} onUpload={upload} onCancel={() => setPicked(null)} />
      ) : (
        canAdd && (
          <div className="row" style={{ marginTop: '.8rem' }}>
            <input id={`${id}_cam`} className="visually-hidden" type="file" accept="image/*" capture="environment" onChange={onPick} />
            <label htmlFor={`${id}_cam`} className="btn accent small">Take a photo<span className="visually-hidden">: {label}</span></label>
            <input id={`${id}_file`} className="visually-hidden" type="file" accept="image/jpeg,image/png,application/pdf" onChange={onPick} />
            <label htmlFor={`${id}_file`} className="btn outline small">Choose from files or gallery<span className="visually-hidden">: {label}</span></label>
          </div>
        )
      )}
      {error && <p className="alert error" role="alert" style={{ marginTop: '.75rem', marginBottom: 0 }}>{error}</p>}
      {viewing && <DocViewer title={`${label}`} load={load} onClose={() => setViewing(null)} />}
    </div>
  )
}

export function UploadNote() {
  return (
    <div className="upload-note">
      <p className="mt-0 mb-0">{UPLOAD_NOTE}</p>
      {SHOW_ML_HELP && <details className="ml-help"><summary lang="ml">മലയാളത്തിൽ അറിയാൻ</summary><p lang="ml" className="help">{UPLOAD_NOTE_ML}</p></details>}
    </div>
  )
}

export const filesOf = (docs, typeId) => docs.filter((d) => d.doc_type_id === typeId).sort((a, b) => a.version - b.version)

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
        <Slot key={type.id} type={type} files={filesOf(data.docs, type.id)} application={app} reload={reload} />
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
