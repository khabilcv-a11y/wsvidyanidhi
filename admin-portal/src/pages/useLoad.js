import { useCallback, useEffect, useState } from 'react'
import { call } from '@shared/lib/api.js'

// Load one backend action and expose { data, error, loading, reload }.
export function useLoad(action, params) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const key = JSON.stringify(params ?? {})
  const reload = useCallback(async () => {
    try {
      setState({ data: await call(action, JSON.parse(key)), error: null, loading: false })
    } catch (e) {
      setState({ data: null, error: e.message, loading: false })
    }
  }, [action, key])
  useEffect(() => {
    reload()
  }, [reload])
  return { ...state, reload }
}
