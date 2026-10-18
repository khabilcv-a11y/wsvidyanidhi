import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { call, getToken, setToken } from './api.js'

const Ctx = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: Boolean(getToken()), user: null, via: null, error: null })

  const load = useCallback(async () => {
    if (!getToken()) {
      setState({ loading: false, user: null, via: null, error: null })
      return
    }
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const r = await call('me')
      setState({ loading: false, user: r.user, via: r.via, error: null })
    } catch (e) {
      // A network failure must not look like being signed out.
      setState({ loading: false, user: null, via: null, error: ['NETWORK', 'SERVER', 'CONFIG'].includes(e.code) ? e : null })
    }
  }, [])

  useEffect(() => {
    load()
    const out = () => setState({ loading: false, user: null, via: null, error: null })
    window.addEventListener('vn:signed-out', out)
    return () => window.removeEventListener('vn:signed-out', out)
  }, [load])

  const value = useMemo(() => ({
    ...state,
    retry: load,
    // `session` is the { token, user, via } reply of any sign-in call
    start: (session) => {
      setToken(session.token)
      setState({ loading: false, user: session.user, via: session.via, error: null })
    },
    signOut: () => {
      setToken(null)
      setState({ loading: false, user: null, via: null, error: null })
    },
    isStaff: Boolean(state.user && ['admin', 'master'].includes(state.user.role)),
  }), [state, load])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useAuth = () => useContext(Ctx)
