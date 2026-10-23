import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

// English first, Malayalam second. Missing Malayalam falls back to English.
// Malayalam is a draft translation for the committee to review.
const dict = {
  appName: ['Vidyanidhi Scholarship Programme', 'വിദ്യാനിധി സ്കോളർഷിപ്പ്'],
  skip: ['Skip to main content', 'പ്രധാന ഉള്ളടക്കത്തിലേക്ക് പോകുക'],
  home: ['Home page', 'ഹോം പേജ്'],
  signIn: ['Sign in', 'സൈൻ ഇൻ'],
  signUp: ['Create account', 'അക്കൗണ്ട് ഉണ്ടാക്കുക'],
  signOut: ['Sign out', 'സൈൻ ഔട്ട്'],
  welcomeBack: ['Welcome back', 'സ്വാഗതം'],
  signInLead: ['Sign in to continue your application.', 'അപേക്ഷ തുടരാൻ സൈൻ ഇൻ ചെയ്യുക.'],
  createLead: ['Create your account to apply for the scholarship.', 'സ്കോളർഷിപ്പിന് അപേക്ഷിക്കാൻ അക്കൗണ്ട് ഉണ്ടാക്കുക.'],
  or: ['or use email', 'അല്ലെങ്കിൽ ഇമെയിൽ'],
  email: ['Email address', 'ഇമെയിൽ വിലാസം'],
  password: ['Password', 'പാസ്‌വേഡ്'],
  passwordHint: ['At least 8 characters.', 'കുറഞ്ഞത് 8 അക്ഷരങ്ങൾ.'],
  fullName: ['Full name', 'പൂർണ്ണ നാമം'],
  forgot: ['Forgot password?', 'പാസ്‌വേഡ് മറന്നോ?'],
  sendCode: ['Send me a code', 'കോഡ് അയക്കുക'],
  backToSignIn: ['Back to sign in', 'സൈൻ ഇന്നിലേക്ക് മടങ്ങുക'],
  haveAccount: ['Already have an account? Sign in', 'അക്കൗണ്ട് ഉണ്ടോ? സൈൻ ഇൻ ചെയ്യുക'],
  noAccount: ['New here? Create an account', 'പുതിയതാണോ? അക്കൗണ്ട് ഉണ്ടാക്കുക'],
  code: ['6-digit code', '6 അക്ക കോഡ്'],
  codeSent: ['We sent a 6-digit code to your email. It is valid for 15 minutes. Check your spam folder too.', 'നിങ്ങളുടെ ഇമെയിലിലേക്ക് 6 അക്ക കോഡ് അയച്ചിട്ടുണ്ട്. 15 മിനിറ്റ് സാധുത. സ്പാം ഫോൾഡറും നോക്കുക.'],
  verify: ['Verify and continue', 'സ്ഥിരീകരിച്ച് തുടരുക'],
  resetTitle: ['Reset your password', 'പാസ്‌വേഡ് പുതുക്കുക'],
  resetLead: ['Enter your email and we will send you a code.', 'ഇമെയിൽ നൽകൂ, ഞങ്ങൾ കോഡ് അയക്കും.'],
  newPassword: ['New password', 'പുതിയ പാസ്‌വേഡ്'],
  setPassword: ['Set password and sign in', 'പാസ്‌വേഡ് സെറ്റ് ചെയ്ത് സൈൻ ഇൻ ചെയ്യുക'],
  devNote: ['Developer sign-in (no Google client is configured)', 'ഡെവലപ്പർ സൈൻ ഇൻ (Google ക്രമീകരിച്ചിട്ടില്ല)'],
  continueGoogle: ['Continue with Google', 'Google ഉപയോഗിച്ച് തുടരുക'],
  save: ['Save', 'സേവ് ചെയ്യുക'],
  saved: ['Saved', 'സേവ് ചെയ്തു'],
  next: ['Next', 'അടുത്തത്'],
  back: ['Back', 'പിന്നോട്ട്'],
  submit: ['Submit application', 'അപേക്ഷ സമർപ്പിക്കുക'],
  dashboard: ['Dashboard', 'ഡാഷ്ബോർഡ്'],
  application: ['Application', 'അപേക്ഷ'],
  documents: ['Documents', 'രേഖകൾ'],
  pending: ['To do', 'ചെയ്യാനുള്ളവ'],
  nothingPending: ['Nothing pending. You are up to date.', 'ഒന്നും ബാക്കിയില്ല.'],
  startApplication: ['Start your application', 'അപേക്ഷ ആരംഭിക്കുക'],
  startLead: ['Applications are open. It takes about 15 minutes, and your progress is saved as you go.', 'അപേക്ഷകൾ സ്വീകരിക്കുന്നു. ഏകദേശം 15 മിനിറ്റ് മതി; പുരോഗതി സ്വയം സേവ് ആകും.'],
  continueApplication: ['Continue your application', 'അപേക്ഷ തുടരുക'],
  closed: ['Applications are not open right now.', 'ഇപ്പോൾ അപേക്ഷകൾ സ്വീകരിക്കുന്നില്ല.'],
  loading: ['Loading…', 'ലോഡ് ചെയ്യുന്നു…'],
  due: ['Due', 'അവസാന തീയതി'],
  upload: ['Upload', 'അപ്‌ലോഡ്'],
  uploadAgain: ['Upload again', 'വീണ്ടും അപ്‌ലോഡ് ചെയ്യുക'],
  view: ['View', 'കാണുക'],
  close: ['Close', 'അടയ്ക്കുക'],
  notUploaded: ['Not uploaded', 'അപ്‌ലോഡ് ചെയ്തിട്ടില്ല'],
  docHelp: ['Take a clear photo with your phone, or choose a PDF under 2 MB. Photos are reduced automatically.', 'ഫോണിൽ വ്യക്തമായ ഫോട്ടോ എടുക്കുക, അല്ലെങ്കിൽ 2 MB-യിൽ താഴെയുള്ള PDF തിരഞ്ഞെടുക്കുക. ഫോട്ടോകൾ സ്വയം ചെറുതാക്കും.'],
  sendForReview: ['Send for review', 'പരിശോധനയ്ക്ക് അയക്കുക'],
  sendForReviewText: ['All requested documents are uploaded. Send them back to the committee.', 'ആവശ്യപ്പെട്ട എല്ലാ രേഖകളും അപ്‌ലോഡ് ചെയ്തു. കമ്മിറ്റിക്ക് തിരിച്ചയക്കുക.'],
  consentTitle: ['Privacy notice and consent', 'സ്വകാര്യതാ അറിയിപ്പും സമ്മതവും'],
  consentBody: [
    'We collect your details and documents only to assess your scholarship application and to manage your scholarship. They are seen only by the committee members who need them, kept as long as the scheme requires, and deleted on request where the law allows. Contact the scholarship office for any data question.',
    'താങ്കളുടെ അപേക്ഷ വിലയിരുത്താനും സ്കോളർഷിപ്പ് നടത്തിപ്പിനും മാത്രമാണ് വിവരങ്ങളും രേഖകളും ശേഖരിക്കുന്നത്. ആവശ്യമുള്ള കമ്മിറ്റി അംഗങ്ങൾ മാത്രമേ ഇവ കാണൂ. ഡാറ്റ സംബന്ധമായ സംശയങ്ങൾക്ക് സ്കോളർഷിപ്പ് ഓഫീസുമായി ബന്ധപ്പെടുക.'],
  readNotice: ['Read the full privacy notice', 'പൂർണ്ണ സ്വകാര്യതാ അറിയിപ്പ് വായിക്കുക'],
  consentAgree: ['I have read this notice and I agree', 'ഈ അറിയിപ്പ് വായിച്ചു, ഞാൻ സമ്മതിക്കുന്നു'],
  consentMinor: ['I am under 18 and my parent or guardian agrees', 'എനിക്ക് 18 വയസ്സില്ല; രക്ഷിതാവ് സമ്മതിക്കുന്നു'],
  guardianName: ['Parent or guardian name', 'രക്ഷിതാവിന്റെ പേര്'],
  continue: ['Continue', 'തുടരുക'],
  language: ['Language', 'ഭാഷ'],
  retry: ['Try again', 'വീണ്ടും ശ്രമിക്കുക'],
  stepPersonal: ['Personal', 'വ്യക്തിഗതം'],
  stepGuardian: ['Guardian and income', 'രക്ഷിതാവും വരുമാനവും'],
  stepCourse: ['Course', 'കോഴ്സ്'],
  stepExam: ['Previous exam', 'മുൻ പരീക്ഷ'],
  nativePlace: ['Native place', 'സ്വദേശം'],
  postOffice: ['Post office', 'പോസ്റ്റ് ഓഫീസ്'],
  pinCode: ['PIN code', 'പിൻ കോഡ്'],
  courseCategory: ['Course category', 'കോഴ്സ് വിഭാഗം'],
  collegeState: ['College state', 'കോളേജ് സ്ഥിതി ചെയ്യുന്ന സംസ്ഥാനം'],
  collegeDistrict: ['College district', 'കോളേജ് ജില്ല'],
  collegeAddress: ['College address', 'കോളേജ് വിലാസം'],
  gpa: ['GPA / CGPA (if grades are given)', 'ജി.പി.എ / സി.ജി.പി.എ'],
  hasBackpapers: ['Do you have back papers?', 'ബാക്ക് പേപ്പറുകൾ ഉണ്ടോ?'],
  backpaperCount: ['How many back papers?', 'എത്ര ബാക്ക് പേപ്പറുകൾ?'],
  prevQualification: ['Previous qualification', 'മുൻ യോഗ്യത'],
  prevUniversity: ['Previous university / board', 'മുൻ യൂണിവേഴ്സിറ്റി / ബോർഡ്'],
  prevCollege: ['Previous school / college', 'മുൻ സ്കൂൾ / കോളേജ്'],
  hosteller: ['Do you stay in a hostel?', 'ഹോസ്റ്റലിൽ താമസിക്കുന്നുണ്ടോ?'],
  tuitionFees: ['Tuition and other fees per year (₹)', 'വാർഷിക ട്യൂഷൻ/മറ്റ് ഫീസ് (₹)'],
  hostelFees: ['Hostel fees per year (₹)', 'വാർഷിക ഹോസ്റ്റൽ ഫീസ് (₹)'],
  travelExpense: ['Travel expense per year (₹)', 'വാർഷിക യാത്രാച്ചെലവ് (₹)'],
  expenseTotal: ['Total expense per year (₹)', 'ആകെ വാർഷിക ചെലവ് (₹)'],
  wisdomScholarship: ['Did you receive a Wisdom scholarship before?', 'മുമ്പ് വിസ്ഡം സ്കോളർഷിപ്പ് ലഭിച്ചിട്ടുണ്ടോ?'],
  wisdomScholarshipYear: ['Which year(s)?', 'ഏത് വർഷം?'],
  otherScholarship: ['Do you receive any other scholarship?', 'മറ്റ് സ്കോളർഷിപ്പ് ലഭിക്കുന്നുണ്ടോ?'],
  otherScholarshipName: ['Scholarship name', 'സ്കോളർഷിപ്പിന്റെ പേര്'],
  otherScholarshipProvider: ['Provided by', 'നൽകുന്നത്'],
  otherScholarshipAmount: ['Amount per year (₹)', 'വാർഷിക തുക (₹)'],
  yes: ['Yes', 'ഉണ്ട്'],
  no: ['No', 'ഇല്ല'],
  stepExpenses: ['Expenses', 'ചെലവുകൾ'],
  stepScholarships: ['Scholarships', 'സ്കോളർഷിപ്പുകൾ'],
  ug: ['Undergraduate (UG)', 'ബിരുദം (UG)'],
  pg: ['Postgraduate (PG)', 'ബിരുദാനന്തര ബിരുദം (PG)'],
  diploma: ['Diploma', 'ഡിപ്ലോമ'],
  otherCat: ['Others', 'മറ്റുള്ളവ'],
  stepReview: ['Review', 'പരിശോധിക്കുക'],
  gender: ['Gender', 'ലിംഗം'],
  male: ['Male', 'പുരുഷൻ'],
  female: ['Female', 'സ്ത്രീ'],
  other: ['Other', 'മറ്റുള്ളവ'],
  dob: ['Date of birth', 'ജനന തീയതി'],
  district: ['Native district', 'സ്വന്തം ജില്ല'],
  phone: ['Mobile number', 'മൊബൈൽ നമ്പർ'],
  whatsapp: ['WhatsApp number', 'വാട്സ്ആപ്പ് നമ്പർ'],
  address: ['Address', 'വിലാസം'],
  guardianPhone: ['Guardian phone', 'രക്ഷിതാവിന്റെ ഫോൺ'],
  guardianOccupation: ['Guardian occupation', 'രക്ഷിതാവിന്റെ തൊഴിൽ'],
  income: ['Annual family income (₹)', 'വാർഷിക കുടുംബ വരുമാനം (₹)'],
  course: ['Course', 'കോഴ്സ്'],
  subject: ['Subject', 'വിഷയം'],
  courseType: ['Type of institution', 'സ്ഥാപനത്തിന്റെ തരം'],
  selfFinancing: ['Self-financing', 'സ്വാശ്രയം'],
  aided: ['Aided', 'എയ്ഡഡ്'],
  government: ['Government', 'സർക്കാർ'],
  stream: ['Stream', 'സ്ട്രീം'],
  duration: ['Course duration (years)', 'കോഴ്സ് കാലാവധി (വർഷം)'],
  yearOfStudy: ['Current year of study', 'ഇപ്പോഴത്തെ വർഷം'],
  completionMonth: ['Expected completion month', 'പൂർത്തിയാകുന്ന മാസം'],
  university: ['University', 'യൂണിവേഴ്സിറ്റി'],
  college: ['College', 'കോളേജ്'],
  lastExam: ['Last board or university exam', 'അവസാനം എഴുതിയ ബോർഡ്/യൂണിവേഴ്സിറ്റി പരീക്ഷ'],
  lastExamYear: ['Year', 'വർഷം'],
  lastPercentage: ['Percentage', 'ശതമാനം'],
  select: ['Select…', 'തിരഞ്ഞെടുക്കുക…'],
  reviewLead: ['Check your details, then submit. You can add documents after submitting; missing ones appear in your To do list.', 'വിവരങ്ങൾ പരിശോധിച്ച് സമർപ്പിക്കുക. രേഖകൾ പിന്നീടും ചേർക്കാം; ബാക്കിയുള്ളവ ചെയ്യാനുള്ളവയിൽ കാണാം.'],
  submittedLocked: ['This application has been submitted and can no longer be edited here.', 'ഈ അപേക്ഷ സമർപ്പിച്ചു; ഇവിടെ ഇനി തിരുത്താനാവില്ല.'],
  applicationNo: ['Application number', 'അപേക്ഷാ നമ്പർ'],
  progress: ['Progress', 'പുരോഗതി'],
}

const Ctx = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      return 'en' // English only for now
    } catch {
      return 'en'
    }
  })
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
  const setLang = useCallback((l) => {
    setLangState(l)
    try {
      localStorage.setItem('lang', l)
    } catch {
      /* ignore */
    }
  }, [])
  const value = useMemo(() => ({
    lang,
    setLang,
    t: (k) => {
      const entry = dict[k]
      return entry ? entry[lang === 'ml' ? 1 : 0] || entry[0] : k
    },
  }), [lang, setLang])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useI18n = () => useContext(Ctx)
