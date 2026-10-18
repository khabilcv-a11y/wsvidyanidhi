// Display names for the codes the backend stores. English, with Malayalam for what verifiers and scholars see.

export const LABELS = {
  house: {
    own: 'Own house', rent: 'Rent', joint: 'Joint family', other: 'Other',
  },
  fin_condition: {
    very_poor: 'Very poor', poor: 'Poor', below_average: 'Below average', average: 'Average', above_average: 'Above average',
  },
  zakat_category: {
    faqeer: 'Faqeer (poor and needy)', miskeen: 'Miskeen (poor and needy)', yatheem: 'Yatheem (father is deceased)',
    debt: 'Debt-affected family (കടബാധിതർ)', no_regular_income: 'Family without a regular income',
    chronic_illness: 'A family with a chronically ill member (നിത്യരോഗി)', other_difficulty: 'Financial difficulties due to other reasons',
    no_difficulty_consider: 'No financial difficulties, but may be considered', no_difficulty_reject: 'No financial difficulties, so no need to consider',
  },
  connection: {
    functionary: 'District / Zone / Unit / Campus functionary', member: 'Member', supporter: 'Supporter', none: 'No connection',
    relative_of_worker: 'Relative of an active worker', other_org: 'Member or worker of another religious organisation',
  },
  category: { ug: 'UG (Degree)', pg: 'PG', diploma: 'Diploma', others: 'Others' },
  course_type: { self_financing: 'Self-financing', aided: 'Aided', government: 'Government' },
  fund: { zakat: 'Zakat fund', non_zakat: 'Non-Zakat fund' },
  yesno: { yes: 'Yes', no: 'No' },
  reply: { none: 'No reply', attending: 'Attending', not_attending: 'Cannot attend', online: 'Online interview' },
  reason: { difficult_to_travel: 'Difficult to travel', no_need: 'Scholarship not needed', other: 'Other reason' },
  transport: { bus: 'Bus', train: 'Train', own_vehicle: 'Own vehicle', other: 'Other' },
  attendance: { present: 'Present', absent: 'Absent', online: 'Online', '': '—' },
  renewal_decision: {
    continue: 'Continue', continue_increase: 'Continue, amount increased', continue_reduce: 'Continue, amount reduced',
    on_hold: 'On hold (verification)', no_need: 'No need (scholar opted out)', removed: 'Removed', course_completed: 'Course completed',
    closed: 'Closed', call_back: 'Call back', file_missing: 'File missing', not_attending: 'Not attending',
  },
  payment: { pending: 'Pending', paid: 'Paid', failed: 'Failed' },
  bank: { submitted: 'Submitted', verified: 'Verified', change_requested: 'Change requested' },
}

// Malayalam for the verifier's phone form.
export const LABELS_ML = {
  house: { own: 'സ്വന്തം വീട്', rent: 'വാടക', joint: 'കൂട്ടുകുടുംബം', other: 'മറ്റുള്ളവ' },
  fin_condition: { very_poor: 'വളരെ ദരിദ്രം', poor: 'ദരിദ്രം', below_average: 'ശരാശരിക്ക് താഴെ', average: 'ശരാശരി', above_average: 'ശരാശരിക്ക് മുകളിൽ' },
  yesno: { yes: 'അതെ', no: 'അല്ല' },
}

export const label = (group, code, lang = 'en') => (lang === 'ml' && LABELS_ML[group]?.[code]) || LABELS[group]?.[code] || code || '—'

export const options = (group, lang = 'en') => Object.keys(LABELS[group]).map((k) => [k, label(group, k, lang)])

export const monthName = (ym) => {
  if (!ym) return '—'
  const [y, m] = ym.split('-')
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString('en-IN', { month: 'short', year: 'numeric' })
}

export const rupees = (n) => (n === null || n === undefined || n === '' ? '—' : '₹' + Number(n).toLocaleString('en-IN'))
