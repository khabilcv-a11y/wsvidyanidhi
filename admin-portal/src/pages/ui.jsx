import { useEffect, useState } from 'react'
import { call } from '@shared/lib/api.js'

export const Loading = () => <p role="status"><span className="spinner" />Loading…</p>
export const ErrorNote = ({ children }) => (children ? <p className="alert error" role="alert">{children}</p> : null)
export const Done = ({ children }) => (children ? <p className="alert success" role="status">{children}</p> : null)

// Vocabulary and settings from the backend, loaded once per visit.
let metaPromise = null
export function useMeta() {
  const [meta, setMeta] = useState(null)
  useEffect(() => {
    metaPromise = metaPromise || call('meta')
    metaPromise.then(setMeta).catch(() => { metaPromise = null })
  }, [])
  return meta
}

// Load a read-only action once; returns the data or null.
export function useLoadOnce(action, params) {
  const [data, setData] = useState(null)
  const key = JSON.stringify(params ?? {})
  useEffect(() => {
    let alive = true
    call(action, JSON.parse(key)).then((d) => alive && setData(d)).catch(() => {})
    return () => { alive = false }
  }, [action, key])
  return data
}

// Run an async action with shared busy / error / success state.
export function useAction() {
  const [state, setState] = useState({ busy: false, error: null, done: null })
  const run = async (fn, doneMessage) => {
    setState({ busy: true, error: null, done: null })
    try {
      const r = await fn()
      setState({ busy: false, error: null, done: doneMessage || null })
      return r
    } catch (e) {
      setState({ busy: false, error: e.message, done: null })
      return undefined
    }
  }
  return [state, run]
}

export function Select({ id, label, value, onChange, options, required, blank = 'Select…', hint }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}{required && <span className="req" aria-hidden="true"> *</span>}</label>
      <select id={id} value={value ?? ''} required={required} onChange={(e) => onChange(e.target.value)}>
        {blank !== null && <option value="">{blank}</option>}
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

export function Input({ id, label, value, onChange, type = 'text', required, hint, ...rest }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}{required && <span className="req" aria-hidden="true"> *</span>}</label>
      <input id={id} type={type} value={value ?? ''} required={required} onChange={(e) => onChange(e.target.value)} {...rest} />
      {hint && <p className="hint">{hint}</p>}
    </div>
  )
}

export const downloadText = (filename, text, type = 'text/csv') => {
  const url = URL.createObjectURL(new Blob(['﻿' + text], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// Cells starting with = + - @ can run as formulas when a CSV is opened in a spreadsheet.
export const csvCell = (v) => {
  let s = String(v ?? '')
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s
  return `"${s.replaceAll('"', '""')}"`
}
export const toCsv = (head, rows) => [head.map(csvCell).join(','), ...rows.map((r) => r.map(csvCell).join(','))].join('\n')
