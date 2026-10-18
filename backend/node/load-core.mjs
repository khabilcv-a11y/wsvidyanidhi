// Loads backend/core/*.js (plain scripts) into one scope with a given platform `P`.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const coreDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'core')

export function loadCore(P) {
  const source = fs.readdirSync(coreDir).filter((f) => f.endsWith('.js')).sort()
    .map((f) => fs.readFileSync(path.join(coreDir, f), 'utf8')).join('\n')
  const factory = new Function('P', `${source}\nreturn { handle, seedData, jobFlushOutbox, jobReminders, ACTIONS, ApiError };`)
  return factory(P)
}
