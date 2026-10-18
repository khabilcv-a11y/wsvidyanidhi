import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { call } from '@shared/lib/api.js'

const Ctx = createContext(null)

// One load of everything the applicant screens need; each screen reads it and calls reload() after a change.
export function AppDataProvider({ children }) {
  const [state, setState] = useState({ loading: true, data: null, error: null })

  const reload = useCallback(async () => {
    try {
      const data = await call('app.load')
      setState({ loading: false, data, error: null })
    } catch (e) {
      setState((s) => ({ ...s, loading: false, error: e }))
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const value = useMemo(() => ({ ...state, reload }), [state, reload])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAppData = () => useContext(Ctx)
export const EDITABLE = ['draft', 'documents_requested']
