export const DISTRICTS = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki',
  'Ernakulam', 'Thrissur', 'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad',
  'Kannur', 'Kasaragod', 'Outside Kerala',
]

export const STATUS = {
  draft: { en: 'Draft', ml: 'കരട്', tone: 'warn' },
  submitted: { en: 'Submitted, under review', ml: 'സമർപ്പിച്ചു, പരിശോധനയിൽ', tone: 'info' },
  documents_requested: { en: 'Documents requested', ml: 'രേഖകൾ ആവശ്യമുണ്ട്', tone: 'danger' },
  under_verification: { en: 'Field verification', ml: 'നേരിട്ടുള്ള പരിശോധന', tone: 'info' },
  interview_scheduled: { en: 'Interview scheduled', ml: 'ഇന്റർവ്യൂ നിശ്ചയിച്ചു', tone: 'info' },
  decision_pending: { en: 'Awaiting decision', ml: 'തീരുമാനം കാത്തിരിക്കുന്നു', tone: 'info' },
  selected: { en: 'Selected, bank details due', ml: 'തിരഞ്ഞെടുത്തു, ബാങ്ക് വിവരങ്ങൾ നൽകുക', tone: 'ok' },
  active: { en: 'Active scholar', ml: 'സ്കോളർ', tone: 'ok' },
  renewal_due: { en: 'Renewal due', ml: 'പുതുക്കൽ വേണം', tone: 'warn' },
  renewal_review: { en: 'Renewal under review', ml: 'പുതുക്കൽ പരിശോധനയിൽ', tone: 'info' },
  not_selected: { en: 'Not selected', ml: 'തിരഞ്ഞെടുത്തില്ല', tone: '' },
  waitlisted: { en: 'Waitlisted', ml: 'കാത്തിരിപ്പ് പട്ടിക', tone: 'warn' },
  on_hold: { en: 'On hold', ml: 'തൽക്കാലം നിർത്തി', tone: 'warn' },
  discontinued: { en: 'Discontinued', ml: 'നിർത്തലാക്കി', tone: '' },
  completed: { en: 'Completed', ml: 'പൂർത്തിയായി', tone: 'ok' },
}

// Stages shown in the applicant's tracker
export const STAGES = [
  { key: 'applied', en: 'Applied', ml: 'അപേക്ഷ', statuses: ['draft', 'submitted'] },
  { key: 'docs', en: 'Documents', ml: 'രേഖകൾ', statuses: ['documents_requested'] },
  { key: 'verify', en: 'Verification', ml: 'പരിശോധന', statuses: ['under_verification'] },
  { key: 'interview', en: 'Interview', ml: 'ഇന്റർവ്യൂ', statuses: ['interview_scheduled'] },
  { key: 'decision', en: 'Decision', ml: 'തീരുമാനം', statuses: ['decision_pending', 'selected', 'not_selected', 'waitlisted'] },
  { key: 'scholar', en: 'Scholar', ml: 'സ്കോളർ', statuses: ['active', 'renewal_due', 'renewal_review', 'on_hold', 'completed', 'discontinued'] },
]

export const DOC_STATUS = {
  under_review: { en: 'Under review', ml: 'പരിശോധനയിൽ', tone: 'warn' },
  accepted: { en: 'Accepted', ml: 'സ്വീകരിച്ചു', tone: 'ok' },
  reupload: { en: 'Re-upload needed', ml: 'വീണ്ടും അപ്‌ലോഡ് ചെയ്യുക', tone: 'danger' },
}

export const PRIVACY_VERSION = '2026-10-v1'
