// What the application asks for, section by section. Shown before the applicant starts ("keep these ready")
// and used by the form and the review page. HELP_ML is the Malayalam explanation behind each question's
// information button. The wording is a first draft and must be checked by the committee.

// Malayalam help stays off the live site until the committee has checked the wording.
export const SHOW_ML_HELP = false

export const SECTIONS = [
  {
    key: 'personal', title: 'Personal details', short: 'Personal',
    ready: ['Your full name as on your SSLC certificate', 'Date of birth', 'Native district and place', 'Full address with post office and PIN code', 'Your mobile number, and WhatsApp number if different', 'An email address, if you have one (optional)'],
  },
  {
    key: 'guardian', title: 'Guardian and family income', short: 'Guardian',
    ready: ['Name, phone number and occupation of your parent or guardian', 'Total yearly income of your family (the village office income certificate is the best guide)'],
  },
  {
    key: 'course', title: 'Course and college', short: 'Course',
    ready: ['Name of your course and main subject', 'Current year of study and the month the course ends', 'College name, address, district and state', 'University, and whether the college is government, aided or self-financing'],
  },
  {
    key: 'exam', title: 'Previous exam', short: 'Exam',
    ready: ['Your last exam mark list (percentage, or GPA/CGPA if grades are given)', 'Number of back papers, if any', 'Details of the qualification you completed before this course'],
  },
  {
    key: 'expenses', title: 'Yearly expenses', short: 'Expenses',
    ready: ['Tuition and other fees for one year (see your fee receipt)', 'Hostel fees for one year, if you stay in a hostel', 'Yearly travel cost to college'],
  },
  {
    key: 'scholarships', title: 'Other scholarships', short: 'Scholarships',
    ready: ['Whether you received a Wisdom scholarship before, and in which year', 'Name, provider and yearly amount of any other scholarship you receive'],
  },
  {
    key: 'documents', title: 'Documents', short: 'Documents',
    ready: [], // filled from the document list
  },
  { key: 'review', title: 'Check and submit', short: 'Submit', ready: [] },
]

export const UPLOAD_NOTE = 'Photo (JPG or PNG) or PDF, up to 2 MB each. One file per document: if it has several pages, join them into one PDF. You can replace a file up to 4 times.'
export const UPLOAD_NOTE_ML = 'JPG/PNG ഫോട്ടോയോ PDF ഫയലോ ആകാം. ഒരു ഫയലിന് പരമാവധി 2 MB. ഓരോ രേഖയ്ക്കും ഒരു ഫയൽ മാത്രം; ഒന്നിലധികം പേജുണ്ടെങ്കിൽ ഒറ്റ PDF ആക്കുക. ഒരു ഫയൽ പരമാവധി 4 തവണ മാറ്റി അപ്‌ലോഡ് ചെയ്യാം.'

export const DOC_HELP_ML = {
  qualification: 'അവസാനം പാസായ പരീക്ഷയുടെ മാർക്ക് ലിസ്റ്റ് അല്ലെങ്കിൽ സർട്ടിഫിക്കറ്റിന്റെ വ്യക്തമായ ഫോട്ടോ / PDF.',
  fee_receipt: 'ഇപ്പോഴത്തെ വർഷം കോളേജിൽ ഫീസ് അടച്ചതിന്റെ രസീത്. തുകയും തീയതിയും വ്യക്തമായി കാണണം.',
  recommendation: 'നിങ്ങളെ അറിയാവുന്ന ഉത്തരവാദിത്വപ്പെട്ട ഒരു വ്യക്തി (ഉദാ: മഹല്ല് ഭാരവാഹി, അധ്യാപകൻ) ഒപ്പിട്ടു നൽകിയ ശുപാർശക്കത്ത്.',
  ration_card: 'റേഷൻ കാർഡിന്റെ വ്യക്തമായ ഫോട്ടോ. കാർഡുടമയുടെ പേരും കുടുംബാംഗങ്ങളുടെ വിവരങ്ങളും കാണുന്ന പേജുകൾ ഉൾപ്പെടുത്തുക.',
}

export const HELP_ML = {
  full_name: 'SSLC സർട്ടിഫിക്കറ്റിലുള്ളതുപോലെ നിങ്ങളുടെ പൂർണ്ണമായ പേര് എഴുതുക. ചുരുക്കെഴുത്ത് ഒഴിവാക്കുക.',
  gender: 'നിങ്ങളുടെ ലിംഗം തിരഞ്ഞെടുക്കുക.',
  dob: 'SSLC സർട്ടിഫിക്കറ്റിലെ ജനനത്തീയതി നൽകുക.',
  district: 'നിങ്ങളുടെ സ്വന്തം (സ്ഥിരമായി താമസിക്കുന്ന) ജില്ല തിരഞ്ഞെടുക്കുക. പഠിക്കുന്ന സ്ഥലത്തെ ജില്ല അല്ല.',
  native_place: 'നിങ്ങളുടെ സ്വദേശത്തിന്റെ (സ്ഥലം / പഞ്ചായത്ത് / പട്ടണം) പേര് എഴുതുക.',
  phone: 'നിങ്ങൾ സാധാരണ ഉപയോഗിക്കുന്ന 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക. അപേക്ഷയുടെ വിവരങ്ങൾ പിന്നീട് അറിയാൻ ഈ നമ്പർ വേണ്ടിവരും.',
  whatsapp: 'വാട്സ്ആപ്പ് നമ്പർ മൊബൈൽ നമ്പറിൽനിന്ന് വ്യത്യസ്തമാണെങ്കിൽ മാത്രം നൽകുക.',
  email: 'ഇമെയിൽ വിലാസം ഉണ്ടെങ്കിൽ നൽകുക. അപേക്ഷ ലഭിച്ചതിന്റെ അറിയിപ്പും മറ്റും ഇതിലേക്ക് അയയ്ക്കും. ഇല്ലെങ്കിൽ ഒഴിവാക്കാം.',
  address: 'വീട്ടുപേരും സ്ഥലവും ഉൾപ്പെടെ നിങ്ങളുടെ പൂർണ്ണമായ മേൽവിലാസം എഴുതുക.',
  post_office: 'മേൽവിലാസത്തിലെ പോസ്റ്റ് ഓഫീസിന്റെ പേര്.',
  pin_code: 'പോസ്റ്റ് ഓഫീസിന്റെ 6 അക്ക പിൻ കോഡ്.',
  guardian_name: 'രക്ഷിതാവിന്റെ (പിതാവ് / മാതാവ് / സംരക്ഷകൻ) പൂർണ്ണമായ പേര്.',
  guardian_phone: 'രക്ഷിതാവിനെ ബന്ധപ്പെടാൻ കഴിയുന്ന മൊബൈൽ നമ്പർ.',
  guardian_occupation: 'രക്ഷിതാവിന്റെ തൊഴിൽ (ഉദാ: കൂലിപ്പണി, കച്ചവടം, ഡ്രൈവർ, പ്രവാസി).',
  family_income: 'കുടുംബത്തിലെ എല്ലാ അംഗങ്ങളുടെയും ഒരു വർഷത്തെ ആകെ വരുമാനം രൂപയിൽ എഴുതുക. വില്ലേജ് ഓഫീസിൽനിന്നുള്ള വരുമാന സർട്ടിഫിക്കറ്റിലെ തുക നൽകുന്നതാണ് ഉചിതം.',
  category: 'നിങ്ങൾ പഠിക്കുന്ന കോഴ്സ് ഏത് വിഭാഗത്തിൽപ്പെടുന്നു എന്ന് തിരഞ്ഞെടുക്കുക: ബിരുദം (UG), ബിരുദാനന്തര ബിരുദം (PG), ഡിപ്ലോമ, അല്ലെങ്കിൽ മറ്റുള്ളവ.',
  course: 'നിങ്ങൾ പഠിക്കുന്ന കോഴ്സിന്റെ പേര് എഴുതുക (ഉദാ: MBBS, B.Tech, BA, B.Com, MSc).',
  subject: 'കോഴ്സിലെ പ്രധാന വിഷയം (ഉദാ: ഇംഗ്ലീഷ്, കമ്പ്യൂട്ടർ സയൻസ്). ബാധകമല്ലെങ്കിൽ ഒഴിവാക്കാം.',
  course_type: 'നിങ്ങളുടെ കോളേജ് സർക്കാർ, എയ്ഡഡ്, അല്ലെങ്കിൽ സ്വാശ്രയ (സ്വകാര്യ മാനേജ്മെന്റ്) വിഭാഗത്തിൽ ഏതിൽപ്പെടുന്നു എന്ന് തിരഞ്ഞെടുക്കുക.',
  stream: 'നിങ്ങളുടെ പഠനമേഖല തിരഞ്ഞെടുക്കുക. ഇവയൊന്നും ബാധകമല്ലെങ്കിൽ "Others" തിരഞ്ഞെടുക്കുക.',
  duration_years: 'കോഴ്സിന്റെ ആകെ കാലാവധി എത്ര വർഷമാണെന്ന് തിരഞ്ഞെടുക്കുക.',
  year_of_study: 'ഇപ്പോൾ നിങ്ങൾ ഏത് വർഷത്തിലാണ് പഠിക്കുന്നത് എന്ന് തിരഞ്ഞെടുക്കുക.',
  completion_month: 'കോഴ്സ് പൂർത്തിയാകുന്ന മാസവും വർഷവും തിരഞ്ഞെടുക്കുക.',
  university: 'നിങ്ങളുടെ കോളേജ് ഏത് സർവകലാശാലയ്ക്ക് കീഴിലാണ് (ഉദാ: കാലിക്കറ്റ് യൂണിവേഴ്സിറ്റി).',
  college: 'നിങ്ങൾ പഠിക്കുന്ന കോളേജിന്റെ പൂർണ്ണമായ പേര്.',
  college_state: 'കോളേജ് സ്ഥിതിചെയ്യുന്ന സംസ്ഥാനം തിരഞ്ഞെടുക്കുക.',
  college_district: 'കോളേജ് സ്ഥിതിചെയ്യുന്ന ജില്ല.',
  college_address: 'കോളേജിന്റെ മേൽവിലാസം (സ്ഥലവും പിൻ കോഡും ഉൾപ്പെടെ).',
  last_exam: 'നിങ്ങൾ അവസാനമായി എഴുതിയ പൊതുപരീക്ഷ ഏതാണ് (ഉദാ: പ്ലസ് ടു, ഡിഗ്രി അഞ്ചാം സെമസ്റ്റർ).',
  last_exam_year: 'ആ പരീക്ഷ എഴുതിയ വർഷം.',
  last_percentage: 'ആ പരീക്ഷയിൽ ലഭിച്ച ശതമാനം മാർക്ക്. മാർക്ക് ലിസ്റ്റിൽ ശതമാനം കൊടുത്തിട്ടില്ലെങ്കിൽ ആകെ മാർക്കിൽ എത്ര ലഭിച്ചു എന്ന് കണക്കാക്കി എഴുതുക.',
  gpa: 'ഗ്രേഡ് സമ്പ്രദായമാണെങ്കിൽ മാത്രം GPA / CGPA നൽകുക (ഉദാ: 8.2). അല്ലെങ്കിൽ ഒഴിവാക്കുക.',
  has_backpapers: 'ഏതെങ്കിലും വിഷയത്തിൽ തോറ്റതോ എഴുതാൻ ബാക്കിയുള്ളതോ ആയ പേപ്പറുകൾ (ബാക്ക് പേപ്പർ) ഉണ്ടോ?',
  backpaper_count: 'ബാക്കിയുള്ള പേപ്പറുകളുടെ എണ്ണം.',
  prev_qualification: 'ഈ കോഴ്സിന് ചേരുന്നതിനു മുൻപ് നിങ്ങൾ പൂർത്തിയാക്കിയ യോഗ്യത (ഉദാ: പ്ലസ് ടു, ബി.എ).',
  prev_university: 'ആ യോഗ്യത നേടിയ ബോർഡ് അല്ലെങ്കിൽ സർവകലാശാല (ഉദാ: കേരള ഹയർ സെക്കൻഡറി ബോർഡ്).',
  prev_college: 'ആ യോഗ്യത നേടിയ സ്കൂളിന്റെ അല്ലെങ്കിൽ കോളേജിന്റെ പേര്.',
  hosteller: 'നിങ്ങൾ ഹോസ്റ്റലിലാണോ താമസിക്കുന്നത്?',
  tuition_fees: 'ഒരു വർഷം ട്യൂഷൻ ഫീസും മറ്റു ഫീസുകളും ചേർത്ത് ആകെ എത്ര രൂപ അടയ്ക്കണം. ഫീസ് രസീത് നോക്കി എഴുതുക.',
  hostel_fees: 'ഒരു വർഷത്തെ ഹോസ്റ്റൽ (താമസവും ഭക്ഷണവും) ചെലവ്.',
  travel_expense: 'കോളേജിലേക്കുള്ള യാത്രയ്ക്ക് ഒരു വർഷം ചെലവാകുന്ന തുക.',
  wisdom_scholarship: 'മുൻ വർഷങ്ങളിൽ വിസ്ഡം സ്റ്റുഡന്റ്സിൽനിന്ന് സ്കോളർഷിപ്പ് ലഭിച്ചിട്ടുണ്ടോ?',
  wisdom_scholarship_year: 'ഏത് വർഷം അല്ലെങ്കിൽ വർഷങ്ങളിൽ ലഭിച്ചു.',
  other_scholarship: 'സർക്കാരിൽനിന്നോ മറ്റു സംഘടനകളിൽനിന്നോ ഇപ്പോൾ സ്കോളർഷിപ്പ് ലഭിക്കുന്നുണ്ടോ?',
  other_scholarship_name: 'ആ സ്കോളർഷിപ്പിന്റെ പേര്.',
  other_scholarship_provider: 'സ്കോളർഷിപ്പ് നൽകുന്ന സ്ഥാപനം അല്ലെങ്കിൽ സർക്കാർ വകുപ്പ്.',
  other_scholarship_amount: 'ആ സ്കോളർഷിപ്പിൽനിന്ന് ഒരു വർഷം ലഭിക്കുന്ന തുക.',
  // start page
  start_name: 'നിങ്ങളുടെ പൂർണ്ണമായ പേര് എഴുതുക.',
  start_phone: 'നിങ്ങൾ ഉപയോഗിക്കുന്ന 10 അക്ക മൊബൈൽ നമ്പർ. അപേക്ഷ പിന്നീട് തുറക്കാനും സ്ഥിതി അറിയാനും ഈ നമ്പർ വേണം.',
  start_minor: 'നിങ്ങൾക്ക് 18 വയസ്സ് തികഞ്ഞിട്ടില്ലെങ്കിൽ രക്ഷിതാവിന്റെ പേര് നൽകി സമ്മതം രേഖപ്പെടുത്തണം.',
}

export const SELECT_OPTIONS = {
  gender: [['male', 'Male'], ['female', 'Female'], ['other', 'Other']],
  category: [['ug', 'Degree (UG)'], ['pg', 'Postgraduate (PG)'], ['diploma', 'Diploma'], ['others', 'Others']],
  course_type: [['government', 'Government'], ['aided', 'Aided'], ['self_financing', 'Self-financing']],
  stream: ['Medical', 'Paramedical', 'Engineering', 'Arts & Science', 'Management', 'Law', 'Vocational/Polytechnic', 'Arabic', 'Others'],
  duration_years: ['1', '2', '3', '4', '5', '5.5', '6'],
  year_of_study: ['1', '2', '3', '4', '5', '6'],
  yesno: [['yes', 'Yes'], ['no', 'No']],
  college_state: ['Kerala', 'Tamil Nadu', 'Karnataka', 'Delhi'],
}

// Labels used on the review page
export const LABELS = {
  full_name: 'Full name', gender: 'Gender', dob: 'Date of birth', district: 'Native district', native_place: 'Native place',
  phone: 'Mobile number', whatsapp: 'WhatsApp number', email: 'Email', address: 'Address', post_office: 'Post office', pin_code: 'PIN code',
  guardian_name: 'Guardian name', guardian_phone: 'Guardian phone', guardian_occupation: 'Guardian occupation', family_income: 'Yearly family income (₹)',
  category: 'Course category', course: 'Course', subject: 'Subject', course_type: 'Type of college', stream: 'Stream',
  duration_years: 'Course duration (years)', year_of_study: 'Current year', completion_month: 'Course ends', university: 'University',
  college: 'College', college_state: 'College state', college_district: 'College district', college_address: 'College address',
  last_exam: 'Last exam', last_exam_year: 'Year', last_percentage: 'Percentage', gpa: 'GPA / CGPA', has_backpapers: 'Back papers',
  backpaper_count: 'Number of back papers', prev_qualification: 'Previous qualification', prev_university: 'Board / university', prev_college: 'School / college',
  hosteller: 'Stays in hostel', tuition_fees: 'Tuition and other fees (₹)', hostel_fees: 'Hostel fees (₹)', travel_expense: 'Travel expense (₹)',
  expense_per_year: 'Total yearly expense (₹)', wisdom_scholarship: 'Wisdom scholarship before', wisdom_scholarship_year: 'Year(s)',
  other_scholarship: 'Other scholarship', other_scholarship_name: 'Scholarship name', other_scholarship_provider: 'Provided by', other_scholarship_amount: 'Amount per year (₹)',
}

export const REVIEW_GROUPS = {
  personal: ['full_name', 'gender', 'dob', 'district', 'native_place', 'phone', 'whatsapp', 'email', 'address', 'post_office', 'pin_code'],
  guardian: ['guardian_name', 'guardian_phone', 'guardian_occupation', 'family_income'],
  course: ['category', 'course', 'subject', 'course_type', 'stream', 'duration_years', 'year_of_study', 'completion_month', 'university', 'college', 'college_state', 'college_district', 'college_address'],
  exam: ['last_exam', 'last_exam_year', 'last_percentage', 'gpa', 'has_backpapers', 'backpaper_count', 'prev_qualification', 'prev_university', 'prev_college'],
  expenses: ['hosteller', 'tuition_fees', 'hostel_fees', 'travel_expense', 'expense_per_year'],
  scholarships: ['wisdom_scholarship', 'wisdom_scholarship_year', 'other_scholarship', 'other_scholarship_name', 'other_scholarship_provider', 'other_scholarship_amount'],
}

// Must be filled before the application can be submitted (the same list the backend checks)
export const REQUIRED = [
  ['full_name', 'personal'], ['dob', 'personal'], ['district', 'personal'], ['phone', 'personal'],
  ['guardian_name', 'guardian'], ['course', 'course'], ['college', 'course'],
]
