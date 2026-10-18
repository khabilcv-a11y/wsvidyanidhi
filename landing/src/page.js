import '@shared/styles.css'
import { applyPrefs, mountAccessMenu } from '@shared/a11y.js'

applyPrefs()
const host = document.querySelector('#a11y-host')
if (host) mountAccessMenu(host)
