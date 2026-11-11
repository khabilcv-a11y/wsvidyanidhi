// Suggestion lists for the application form. People can always type something that is not listed.

export const STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir',
  'Ladakh', 'Lakshadweep', 'Puducherry', 'Outside India',
  // other spellings people use, so typing them still finds the state or union territory
  'Pondicherry', 'New Delhi', 'Orissa', 'Daman and Diu', 'Dadra and Nagar Haveli', 'Andaman and Nicobar', 'Jammu and Kashmir (UT)',
]

export const KERALA_DISTRICTS = [
  'Thiruvananthapuram', 'Kollam', 'Pathanamthitta', 'Alappuzha', 'Kottayam', 'Idukki', 'Ernakulam', 'Thrissur',
  'Palakkad', 'Malappuram', 'Kozhikode', 'Wayanad', 'Kannur', 'Kasaragod',
]

// Added to the long university list (loaded from /data/universities.json) so these are always offered
export const UNIVERSITIES_EXTRA = [
  'University of Kerala', 'Mahatma Gandhi University, Kottayam', 'University of Calicut', 'Kannur University',
  'Cochin University of Science and Technology (CUSAT)', 'APJ Abdul Kalam Technological University (KTU)',
  'Kerala University of Health Sciences (KUHS)', 'Kerala Agricultural University', 'Sree Sankaracharya University of Sanskrit',
  'Thunchath Ezhuthachan Malayalam University', 'Kerala University of Fisheries and Ocean Studies (KUFOS)',
  'Kerala Veterinary and Animal Sciences University', 'National University of Advanced Legal Studies (NUALS)',
  'Digital University Kerala', 'Central University of Kerala', 'Kerala Kalamandalam', 'Kerala State Board of Technical Education (Diploma)',
  'Jamia Millia Islamia', 'Aligarh Muslim University', 'Jawaharlal Nehru University', 'University of Delhi', 'Banaras Hindu University',
  'Maulana Azad National Urdu University', 'University of Hyderabad', 'English and Foreign Languages University', 'Pondicherry University',
  'Jamia Hamdard', 'IGNOU (Indira Gandhi National Open University)', 'Calicut University (Distance Education)',
  'Bangalore University', 'Visvesvaraya Technological University', 'Mangalore University', 'Rajiv Gandhi University of Health Sciences',
  'Anna University', 'Bharathiar University', 'University of Madras', 'The Tamil Nadu Dr. M.G.R. Medical University',
  'Osmania University', 'Jawaharlal Nehru Technological University', 'Savitribai Phule Pune University', 'University of Mumbai',
  'Indian Institute of Technology', 'National Institute of Technology', 'Indian Institute of Management', 'Cambridge / Overseas university',
]

export const BOARDS = [
  'Kerala Higher Secondary Board (Plus Two)', 'Kerala SSLC Board', 'Vocational Higher Secondary (VHSE)', 'CBSE', 'ICSE / ISC',
  'Kerala Board of Public Examinations', 'Board of Technical Education (Diploma)', 'Samastha Kerala Islamic Education Board',
  'Other state board',
]

export const COURSES = [
  'MBBS', 'BDS', 'BAMS', 'BHMS', 'BUMS', 'BSMS', 'B.Sc Nursing', 'GNM Nursing', 'B.Pharm', 'D.Pharm', 'Pharm.D', 'BPT (Physiotherapy)', 'BOT (Occupational Therapy)',
  'BMLT (Medical Lab Technology)', 'B.Sc MLT', 'B.Sc Radiology / Imaging Technology', 'B.Sc Optometry', 'B.Sc Anaesthesia Technology', 'BASLP (Speech and Hearing)',
  'B.Sc Operation Theatre Technology', 'B.Sc Cardiac Care Technology', 'B.Sc Dialysis Technology', 'BVSc & AH (Veterinary)', 'B.Tech', 'B.E', 'B.Arch', 'B.Des',
  'Polytechnic Diploma', 'BCA', 'BBA', 'BBM', 'B.Com', 'B.Com (Honours)', 'BA', 'BA (Honours)', 'B.Sc', 'B.Sc (Honours)', 'BSW', 'B.Ed', 'B.P.Ed', 'D.El.Ed', 'LLB (3 year)',
  'BA LLB (5 year)', 'BBA LLB', 'B.Sc Agriculture', 'B.Sc Forestry', 'B.Sc Fisheries', 'B.Sc Food Technology', 'BFA (Fine Arts)', 'BHM (Hotel Management)', 'B.Voc',
  'Integrated MSc', 'Integrated BS-MS', 'Afzal-ul-Ulama', 'Alim / Faizy / Hudawi / Wafy (Islamic studies degree)', 'Diploma in Engineering', 'ITI',
  'M.Tech', 'M.E', 'MBA', 'MCA', 'M.Com', 'MA', 'M.Sc', 'MSW', 'M.Ed', 'LLM', 'M.Pharm', 'M.Sc Nursing', 'MD', 'MS', 'MDS', 'MPT', 'M.Arch', 'M.Des', 'M.Phil', 'PhD',
  'PG Diploma', 'CA (Chartered Accountancy)', 'CMA', 'CS (Company Secretary)', 'ACCA', 'Plus Two (Higher Secondary)',
]

export const SUBJECTS = [
  'Arabic', 'English', 'Malayalam', 'Hindi', 'Urdu', 'Sanskrit', 'Physics', 'Chemistry', 'Mathematics', 'Statistics', 'Botany', 'Zoology', 'Biochemistry',
  'Microbiology', 'Biotechnology', 'Environmental Science', 'Geology', 'Computer Science', 'Computer Applications', 'Data Science', 'Artificial Intelligence',
  'Electronics', 'Electrical and Electronics Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Computer Science and Engineering',
  'Information Technology', 'Electronics and Communication Engineering', 'Chemical Engineering', 'Aeronautical Engineering', 'Architecture',
  'Economics', 'History', 'Political Science', 'Sociology', 'Psychology', 'Philosophy', 'Geography', 'Journalism and Mass Communication', 'Social Work',
  'Library Science', 'Physical Education', 'Commerce', 'Accountancy', 'Finance', 'Business Administration', 'Marketing', 'Human Resource Management',
  'Law', 'Education', 'Islamic Studies', 'Islamic History', 'Fine Arts', 'Music', 'Hotel Management', 'Tourism', 'Nutrition and Dietetics',
  'Food Technology', 'Agriculture', 'Forestry', 'Fisheries', 'Nursing', 'Pharmacy', 'Physiotherapy', 'Medical Laboratory Technology', 'Optometry',
  'Radiology', 'Anaesthesia', 'Public Health', 'Animation and Multimedia',
]

export const OTHER_SCHOLARSHIPS = [
  'Post Matric Scholarship for Minorities (Central)', 'Merit-cum-Means Scholarship (Central)', 'Begum Hazrat Mahal National Scholarship (MAEF)',
  'CH Muhammed Koya Scholarship (Kerala)', 'e-Grantz (Kerala)', 'Central Sector Scholarship (CSSS)', 'National Means-cum-Merit Scholarship (NMMS)',
  'Maulana Azad National Fellowship', 'Sir Dorabji Tata scholarship', 'Vidyadhan (Sarojini Damodaran Foundation)', 'KEAM / Higher education merit scholarship',
  'Panchayat / Local body scholarship', 'Company (CSR) scholarship', 'Trust / Foundation scholarship', 'Mahall committee scholarship',
]

export const PROVIDER_TYPES = [
  ['state_govt', 'State Government'], ['central_govt', 'Central Government'], ['lsgd', 'Local Self Government (panchayat / municipality)'],
  ['corporation', 'Company / Corporation (CSR)'], ['trust', 'Trust / Foundation / Organisation'], ['college', 'College / University'], ['others', 'Others'],
]

export const GUARDIAN_RELATIONS = [
  ['father', 'Father'], ['mother', 'Mother'], ['brother', 'Brother'], ['sister', 'Sister'], ['uncle', 'Uncle'], ['aunt', 'Aunt'],
  ['grandparent', 'Grandparent'], ['others', 'Others'],
]

export const EXAM_LEVELS = [
  ['plus_two', 'Plus Two (Class 12)'], ['degree', 'Degree semester / year'], ['pg', 'PG semester / year'],
  ['diploma', 'Diploma'], ['others', 'Others'],
]

// The five most recent years, for "year" buttons. "Other" lets them type an older year.
export function recentYears(n = 5) {
  const y = new Date().getFullYear()
  return Array.from({ length: n }, (_, i) => String(y - i))
}

// Scheme years the committee has run (for "Which year(s) did you receive the Wisdom scholarship?")
export const WISDOM_YEARS = ['2021–22', '2022–23', '2024–25', '2025–26']

// ---- main subject: suggestions follow the course that was chosen
const ARTS = ['English', 'Malayalam', 'Arabic', 'Hindi', 'Urdu', 'Sanskrit', 'Economics', 'History', 'Political Science', 'Sociology', 'Psychology',
  'Philosophy', 'Geography', 'Journalism and Mass Communication', 'Islamic History', 'Social Work', 'Functional English', 'Public Administration',
  'Library and Information Science', 'Linguistics', 'Multimedia', 'Music', 'Fine Arts']
const SCIENCE = ['Physics', 'Chemistry', 'Mathematics', 'Statistics', 'Botany', 'Zoology', 'Biochemistry', 'Microbiology', 'Biotechnology',
  'Environmental Science', 'Geology', 'Computer Science', 'Electronics', 'Psychology', 'Food Technology', 'Nutrition and Dietetics', 'Home Science',
  'Geography', 'Data Science', 'Artificial Intelligence', 'Forensic Science', 'Industrial Chemistry', 'Applied Chemistry']
const COMMERCE = ['Finance', 'Taxation', 'Computer Applications', 'Co-operation', 'Banking and Insurance', 'Marketing', 'Logistics',
  'International Business', 'Accounting and Finance', 'Business Analytics', 'General Commerce', 'Tourism']
const ENGINEERING = ['Computer Science and Engineering', 'Information Technology', 'Electronics and Communication Engineering',
  'Electrical and Electronics Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering', 'Aeronautical Engineering',
  'Automobile Engineering', 'Biotechnology', 'Artificial Intelligence and Data Science', 'Safety and Fire Engineering', 'Production Engineering',
  'Architecture', 'Instrumentation', 'Naval Architecture']
const MANAGEMENT = ['Finance', 'Marketing', 'Human Resource Management', 'Systems', 'Operations', 'Business Analytics', 'International Business',
  'Tourism and Travel', 'Hospital Administration', 'Retail Management']
const EDUCATION = ['Malayalam', 'English', 'Arabic', 'Hindi', 'Urdu', 'Social Science', 'Natural Science', 'Physical Science', 'Mathematics',
  'Commerce', 'Computer Science', 'Physical Education']
const COMPUTING = ['Computer Applications', 'Computer Science', 'Data Science', 'Artificial Intelligence', 'Cyber Security', 'Software Development']
const POLY = ['Computer Engineering', 'Civil Engineering', 'Mechanical Engineering', 'Electrical and Electronics Engineering',
  'Electronics Engineering', 'Automobile Engineering', 'Architecture', 'Chemical Engineering', 'Instrumentation', 'Textile Technology']

const FAMILIES = [
  [['ba', 'ma'], ARTS], [['bsc', 'msc', 'integratedmsc'], SCIENCE], [['bcom', 'mcom'], COMMERCE], [['btech', 'be', 'mtech', 'me'], ENGINEERING],
  [['mba'], MANAGEMENT], [['bba', 'bbm'], ['General Business Administration', ...MANAGEMENT]], [['bca', 'mca'], COMPUTING],
  [['bed', 'med'], EDUCATION], [['polytechnicdiploma', 'diplomainengineering'], POLY],
]

// Courses that have no separate main subject (the course itself is the programme)
const NO_SUBJECT = new Set([
  'mbbs', 'bds', 'bams', 'bhms', 'bums', 'bsms', 'bscnursing', 'gnmnursing', 'bpharm', 'dpharm', 'pharmd', 'bpt', 'bot', 'bmlt', 'bvscah',
  'barch', 'bdes', 'llb', 'ballb', 'bballb', 'bped', 'deled', 'iti', 'ca', 'cma', 'cs', 'acca', 'md', 'ms', 'mds', 'mpt', 'mpharm',
  'mscnursing', 'march', 'mdes', 'llm', 'afzalululama', 'plustwohighersecondary',
])

const norm = (course) => String(course || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]/g, '')

// 'none' when the course has no subject, a list when we know the subjects of that course, otherwise the general list
export function subjectsFor(course) {
  const n = norm(course)
  if (!n) return { kind: 'general', list: SUBJECTS }
  if (NO_SUBJECT.has(n)) return { kind: 'none', list: [] }
  const fam = FAMILIES.find(([names]) => names.includes(n))
  if (fam) return { kind: 'course', list: fam[1] }
  return { kind: 'general', list: SUBJECTS }
}
