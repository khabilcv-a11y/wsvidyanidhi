import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { call } from '@shared/lib/api.js'

const Ctx = createContext(null)

// The start call already returns everything the portal needs; use it instead of asking again.
let prefetched = null
export const setPrefetched = (d) => { prefetched = d }

// One load of everything the applicant screens need; each screen reads it and calls reload() after a change.
export function AppDataProvider({ children }) {
  const [state, setState] = useState(() => {
    const first = prefetched
    prefetched = null
    return { loading: !first, data: first, error: null }
  })
  const first = useRef(Boolean(state.data))
  const extras = useRef(new Map()) // documents just added; kept visible until the server list includes them

  const reload = useCallback(async () => {
    try {
      const data = await call('app.load')
      const now = Date.now()
      extras.current.forEach((v, id) => {
        if (data.docs.some((d) => d.id === id) || now - v.at > 120000) extras.current.delete(id)
        else data.docs = [v.doc, ...data.docs]
      })
      setState({ loading: false, data, error: null })
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e }))
    }
  }, [])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    reload()
  }, [reload])

  const addDoc = useCallback((doc) => {
    extras.current.set(doc.id, { doc, at: Date.now() })
    setState((s) => (s.data ? { ...s, data: { ...s.data, docs: [doc, ...s.data.docs.filter((d) => d.id !== doc.id)] } } : s))
  }, [])
  const dropDoc = useCallback((id) => {
    extras.current.delete(id)
    setState((s) => (s.data ? { ...s, data: { ...s.data, docs: s.data.docs.filter((d) => d.id !== id) } } : s))
  }, [])

  const value = useMemo(() => ({ ...state, reload, addDoc, dropDoc }), [state, reload, addDoc, dropDoc])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAppData = () => useContext(Ctx)
export const EDITABLE = ['draft', 'documents_requested']
