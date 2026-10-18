// Talks to the backend (Google Apps Script web app, or the local dev server).
// Requests use text/plain so the browser sends them without a CORS preflight.

import { demoCall, isDemo } from './demo.js'

const TOKEN_KEY = 'vn_token'

export class ApiError extends Error {
  constructor(message, code) {
    super(message)
    this.code = code
  }
}

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage blocked: the session lasts until the page is closed */
  }
}

export const config = () => window.__CONFIG__ || {}

export async function call(action, data = {}) {
  if (isDemo()) return demoCall(action, data, config().portal)
  const url = config().apiUrl
  if (!url) throw new ApiError('This portal is not connected to its backend yet.', 'CONFIG')
  let res
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, data, token: getToken() }),
    })
  } catch {
    throw new ApiError('Could not reach the server. Please check your internet connection and try again.', 'NETWORK')
  }
  let json
  try {
    json = await res.json()
  } catch {
    throw new ApiError('The server sent an unexpected reply. Please try again.', 'SERVER')
  }
  if (!json.ok) {
    if (json.code === 'AUTH' && getToken()) {
      setToken(null)
      window.dispatchEvent(new Event('vn:signed-out'))
    }
    throw new ApiError(json.error || 'Something went wrong.', json.code)
  }
  return json.data
}

export const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result).split(',')[1] || '')
    reader.onerror = () => reject(new ApiError('Could not read that file.', 'FILE'))
    reader.readAsDataURL(file)
  })

export const base64ToBlobUrl = (data, mime) => {
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}
