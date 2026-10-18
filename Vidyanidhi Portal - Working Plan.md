# Vidyanidhi Scholarship Portal – Working Plan (₹0 build)

Oct 11, 2026 · Replaces the earlier Revision Plan

> **Update, Oct 16, 2026: platform changed.** Sections 2, 3, 6, 12 and 13 below describe the earlier Supabase-based design.
> The build now uses: **Cloudflare Pages** (three sites: landing page, applicant portal, admin portal), a **Google Apps Script** backend,
> **Google Sheets** as the database, **Google Drive** for documents, and **GitHub** for the code. Still ₹0.
> All functions, roles, statuses, forms, reminders and welfare features in this plan are unchanged.
> What the new platform changes:
> - **Passwords and codes:** sign-up and password reset use an emailed 6-digit code instead of a link. Staff still use Google only.
> - **Access control:** enforced in the backend code (every request re-checks role, district scope and active status) instead of database row-level rules.
> - **Documents:** stored privately in Drive and opened only through the portal; every committee view is logged. Limit 2 MB each.
> - **Email:** about 100 a day on a normal Gmail (about 1,500 on Google Workspace, free for nonprofits). Sign-in codes go first; reminders and notices are queued and sent 07:00 to 21:00.
> - **Speed and size:** each action takes one to three seconds. Suitable for a few thousand applicants.
> - **Backups:** weekly copy of the Sheet to Drive (last 8 kept).
> - **Design:** bright, modern, system fonts, WCAG AA contrast, text size, dark and high-contrast themes, reduced motion, English and Malayalam.
>
> **Build status:** landing page, applicant and admin portals, and the backend are built for Phase 1 (sign-up and sign-in, consent, application form, document checklist, admin review, staff and district scope, audit log, email queue, reminders, backup). Phases 2 to 5 follow. See `SETUP.md`.

## 1. What we are building

One portal where every applicant has a single digital case file, from the first application to the last six-monthly renewal. It replaces the printed, stapled paper file. Alongside the scholarship it gives students guidance on other scholarships and careers, and lets the committee refer families to other Wisdom welfare schemes.

Running cost: **₹0 per month.** Email replaces WhatsApp.

### What changed from the first plan

| Dropped or simplified | Why |
| --- | --- |
| Google Play app (Capacitor) | The Play Store charges a one-time fee, and Google sign-in is unreliable inside app WebViews. A website that can be installed from the browser does the same job. |
| Google-only login | Applicants can also sign up with email and password, with forgot-password by email. Staff stay on Google with 2-step verification. |
| WhatsApp and push notifications | Email plus an in-app notice list instead. Free, and nothing to get approved. |
| Offline sync at venues | Forms autosave drafts on the device. Venues use a phone hotspot. Avoids a large build item. |
| Nightly Google Sheets sync, Drive backup via service account | Excel/CSV export and a monthly backup download. No Google API setup. |
| Separate Referral Contact and Scheme Editor logins | Referrals go out by email and the admin records the outcome. Scheme records are entered by admins. Four roles only. |
| Approval step for amount revisions | A reason is mandatory and logged. An approval step can be switched on later if wanted. |
| Paid Supabase Pro, Workspace for Nonprofits application | Free plan, with the limits handled in section 3. |

## 2. Technology (all free)

| Need | Choice | Notes |
| --- | --- | --- |
| Applicant and verifier access | A website that works on any phone browser, and can optionally be installed as a PWA (progressive web app) | Android: Chrome, Install app. iPhone: Safari, Add to Home Screen. Nothing is published to any app store. Microsoft Power Apps is not used. |
| Admin portal | Same website, opened in a laptop browser | Admin screens appear according to role. One codebase, one deployment. |
| Code | React with Vite | Hosted free on Cloudflare Pages. |
| Address | A subdomain of wisdomislam.org (one DNS record), or the free pages.dev address to start | |
| Database, sign-in, files | Supabase free plan | Postgres with row-level security, Google sign-in, private file storage, scheduled jobs (pg_cron), edge functions. |
| Email | A dedicated Gmail account (for example a Vidyanidhi sender account) sent through SMTP with an app password | Free. Needs no DNS setup. Daily cap: about 500 recipients. |
| Excel and CSV export | Built into the browser app (SheetJS) | |
| PDFs (acknowledgement, sanction letter, candidate report, receipts) | A formatted page saved as PDF from the browser | Renders Malayalam correctly, unlike most PDF libraries. |
| Code and project ownership | A GitHub account and Supabase project owned by a Wisdom organisation email | Not the developer's personal account. |

## 3. Free-plan limits and how each is handled

Limits are from my knowledge of the free tiers. **Confirm them on the Supabase and Cloudflare pricing pages before committing.** If the portal outgrows them, Supabase Pro (about USD 25 a month) is a direct upgrade with no redesign.

| Limit | Handling |
| --- | --- |
| About 1 GB of file storage | Images are compressed on the phone to about 250 KB and PDFs are capped at 2 MB, so an applicant's six documents take about 1.5 MB, roughly 600 applicants. Documents of non-selected applicants are deleted after the retention period. At 800 MB used, closed cases are downloaded as a ZIP to Google Drive and removed. Cloudflare R2 (10 GB free) is the next step if needed. |
| About 500 MB database | Text records only. Plenty for many years. |
| Project pauses after about a week of no activity | A free scheduled ping (GitHub Actions or cron-job.org) every 3 days keeps it awake. |
| No automatic backups | The master admin has a Download full backup button (all tables as Excel, documents as ZIP). Run it monthly and at every cycle close. A calendar reminder is part of the handover guide. |
| Gmail sending cap | Reminders and invitations go through a daily queue that sends up to 400 a day and carries the rest to the next day. |

## 4. Roles

**Sign-in.** The email address is the username.
- **Applicants and verifiers** can use either Continue with Google or email and password. They sign up once with an email address and a password, confirm the email by a link, and can reset a forgotten password from the login page (a reset link is emailed). If the same email is later used with Google, it opens the same account.
- **Admins and master admins** use Google with 2-step verification on their Google account. Password login is switched off for them unless the master admin allows it for a specific person.
- The master admin grants staff access by adding the person's email and role. Roles are enforced in the database, not only on screen.

| Role | Can do | Cannot do |
| --- | --- | --- |
| Applicant | Fill and update own application, upload documents, see status and requests, respond to invitations, submit renewals, enter bank details after selection | See scores, remarks, verification reports or anyone else's file |
| Field verifier (Wisdom bearer) | See name, address, contact and family summary of cases assigned to them; submit the visit report | See documents, scores or unassigned cases |
| Admin (interviewer, committee member) | Review documents, assign verifiers, run interviews, enter scores and remarks, recommend decisions, review renewals, make referrals | Create logins, change settings, see bank details without the finance flag |
| Master admin | Everything, plus logins, settings, final approval, audit log | Nothing restricted. Keep at least two master admins. |

Two flags on admins: **district scope** (sees only listed districts) and **finance** (sees bank details, disbursements and contributions). Every bank-detail view goes through a function that logs it.

If a verifier cannot use the form, an admin enters the report for them.

## 5. Status flow

One status per application. The applicant sees what to do next, and admins see whose turn it is.

Draft → Submitted → Documents requested (loops until complete) → Under field verification → Interview scheduled → Decision pending → Selected (bank details due) → Active scholar ⇄ Renewal due → Renewal under review → Completed.

Side states: Not selected, Waitlisted, On hold, Discontinued (each with a reason).

## 6. Applicant app

1. Sign up or sign in with Google, or with email and password (confirmation email, Forgot password link). Then language choice (Malayalam or English), privacy notice and consent screen. Applicants under 18 also tick guardian consent.
2. Dashboard: stage tracker and a Pending list with due dates.
3. Application form: multi-step, drafts saved automatically, carries over today's form fields.
4. Document checklist: one slot per required document with status (not uploaded, under review, accepted, re-upload needed with reason). Camera upload. Starting list: qualification certificates, fee receipts, recommendation letter, ration card. The master admin can change the list.
5. Invitations: reply Attending, Cannot attend (with reason) or Request online interview. Shows slot, venue and the token on the day.
6. Bank details after selection: account number typed twice, IFSC, passbook image. Locked once an admin verifies them; changes go through a request.
7. Renewal task each six months: latest result, fee receipt, short update form. Past renewals stay visible.
8. Notices list, with the same messages also sent by email.
9. Downloads: acknowledgement, sanction letter and a statement of amounts received.
10. Other scholarships and Career guidance tabs (phase 5).

**Existing 2026 applicants.** Each imported record carries the applicant's email. Signing in with the matching Google account links it automatically. Otherwise they enter application number and date of birth, and the claim goes to an admin approval queue. Date of birth alone is never enough to open a file.

## 7. Admin portal

**Case file** (one page per applicant, every entry stamped with who and when):

| Tab | Holds |
| --- | --- |
| Application | All form data, edits time-stamped |
| Documents | Cards with preview (zoom, rotate, next and previous), accept or request re-upload with a reason, version history, download one or all as ZIP |
| Verification | Assigned bearer, due date, visit report |
| Interviews | One record per round and per panel member; average shown |
| Decision and payments | Recommendation, approval, amount, duration, bank details (finance only), disbursement register, revisions panel |
| Renewals | One entry per period |
| Referrals | Referrals made and their status |
| Timeline | Read-only log of everything |

**Working views:** dashboard with counts by stage and district; queues (documents to review, overdue verifications, interviews this week, renewals due, pending from applicants); searchable applicant list with filters, bulk actions (request documents, send notice, schedule) and Excel export.

**Master admin only:** user management, application window and cycle settings, required-document list, score-sheet criteria and points, reminder intervals, final approval, audit log, reports (applicants by district, course and gender; selection rate; amount disbursed), full backup.

## 8. Interviews and the Intellectual Meet

All three paper sheets become digital forms keyed to the application number. Anything the applicant already entered is pre-filled, so the interviewer verifies and corrects. Original values of any corrected field are kept.

### Admission sheet (first interview)
- **Header:** scheme year, application number, token, event, application mode.
- **Personal and guardian:** name, gender, date of birth, native district and place, address, mobile and WhatsApp number (verified tick), guardian name, phone and occupation, annual family income.
- **Course:** course, subject, type (self-financing, aided, government), stream, duration, year, expected completion month, university, college. The completion month sets the renewal schedule and end date.
- **Previous exam:** board or university, exam, year, percentage.
- **Annual expenses:** tuition, hostel, travel, other; total calculated, each with a "checked against receipt" tick.
- **Other support:** other scholarships, earlier Wisdom scholarship and amount.
- **Outcome:** total score (pulled from the score sheet), grade, recommended monthly amount.

### Score sheet (total 70)
Stored as settings so the committee can change weights without development. Past scores keep the rules that applied when they were given.

| Criterion | Max | Options |
| --- | --- | --- |
| Zakat category | 13 | Yatheem 13, Miskeen 5, Faqeer 5, in debt 5, others 0 |
| Family background | 20 | Very poor 20, Below average 16, Average 10, Above average 6, Rich 0; factors ticked (liabilities, chronic illness, other students, father's job, abandoned by father) |
| Ration card | 5 | Yellow 5, Red 4, Blue 2, White 0 |
| Part-time job | 2 | Yes 2, No 0 |
| Education | 10 | Panel judgement 0 to 10 |
| Course fee per year | 10 | Suggested from the tuition fee: above 5 lakh 10, 3 lakh 8, 2 lakh 6, 1 lakh 4, 50,000 2, below 0. Panel can override with a reason |
| Organisational connection | 10 | District 10, Mandalam or campus 7, Unit 5, Member 3, None 0 |

Also on the sheet: a family members table, questions (how fees are met, who gave the recommendation letter), the Dawah-work flag, and the note on very low-cost courses. The total updates live. Interviewer name and time come from the login.

### Six-monthly renewal sheet
- **Pre-filled summary** of the student, course and college.
- **Study situation:** last exam, result percentage, CGPA or grade, back papers, last fee payment date and amount, future plans. The student fills this beforehand and uploads the mark sheet and receipt.
- **Home situation:** Zakat eligibility and financial status, with last period's values shown.
- **Payment:** monthly amount × months remaining in the course, capped at 6, so the final period is not overpaid. Feeds the disbursement register.
- **Engagement:** participation in Wisdom programmes (filled from meet attendance), campus activities.
- **Decision:** continue (No, Yes, or Ends with this period), remarks, interviewer.

### Running a meet

1. An admin creates the event: date, venue with map link, sessions, interview slots.
2. Choose invitees by filter (new applicants with accepted documents, scholars due for renewal, district) and send invitations by email. The invitation card also appears in the app.
3. Applicants reply in the app. Admins see live counts. Reminders go to non-repliers and to everyone the day before.
4. At the venue a volunteer searches by application number or phone and marks the candidate present, which issues a token. Walk-ins can be added. A QR pass and scanner can be added later if wanted; search is enough to start.
5. Interviewers see the queue in token order and open the pre-filled sheet. Finishing the sheet marks the interview done.
6. After the meet, absentees are listed automatically and can be sent a new slot or an online interview link. Session attendance is ticked from a list and feeds the renewal sheet.

A **contact log** on each case records call attempts (date, mode, outcome, note). If a candidate brings a paper document, the interviewer photographs it into their case on the spot.

## 9. Money: payments, revisions, contributions, exports

- **Disbursements:** each payment records period, amount, date and transaction reference. A running total per scholar and per cycle.
- **Revisions:** changing the monthly amount, duration, status (selected, on hold, discontinued, reinstated), Zakat category or an overridden score item is not saved without a reason category (family income, exam result, fee change, course change, verification finding, committee decision, error correction) and a note. The old value, new value, who and when are kept and shown in the case. The applicant sees the new amount and the date it applies from, not the reason.
- **Contributions register** (finance flag only): date, amount, mode and reference, source type (Islahi Centre, public collection, previous beneficiary, individual donor, other), source (chosen from a list of Islahi Centres, or the old case of a former scholar), scheme or cycle, fund type (Zakat, Sadaqa, general), earmarking, receipt number and a receipt saved as PDF.
- **Fund position:** received, sanctioned, disbursed and balance per scheme, by source type and by centre.
- **Zakat check:** off by default. Once the committee confirms funds are kept separate, a Zakat-funded disbursement requires the case to record Zakat eligibility.
- **Exports:** every list (applicants, scholars, disbursements, contributions) filters by cycle, district, gender, course, status, centre, source and fund type, and exports to Excel/CSV. The result opens in Google Sheets by upload. Bank numbers are excluded unless the person has the finance flag and ticks to include them. Every export is logged.

## 10. Candidate report and pending items

**Candidate report:** one page in date order, opened with Generate report and saved as PDF. It has profile, applications, document list, verification, interviews, meet attendance, decisions and revisions, payments, renewals, contact log, referrals and (with consent) other scholarships. Options: date range or single cycle, and leave out internal remarks when sharing outside the committee. Bank details appear only for the finance flag. Each report generated is logged. The student's own statement is shorter and has no scores or remarks.

**Pending items** are created automatically and closed when done: incomplete application, missing document, re-upload requested, bank details due, renewal upload due, meet reply due. Each shows in the app with a due date, and admins have a Pending from applicants queue with bulk reminders.

**Email reminders** (intervals editable by the master admin):

| When | Sent |
| --- | --- |
| Item created | Email and in-app notice |
| 3 days before due | Email |
| Due date | Email |
| Overdue, every 3 days, up to 3 times | Email |
| After the last reminder | Flagged to the admin for a phone call, logged in the contact log |

Reminders stop when the item closes, and none are sent at night. Each email states what is needed, the deadline and a link to the right screen.

## 11. Welfare: guidance and referrals

### Other scholarships (lean version, phase 5)
- Admins enter schemes (central, Kerala, minority welfare, private) from official notifications: eligibility rules, where to apply, documents, dates, official link. The master admin publishes each one, and every scheme is rechecked annually.
- Eligibility is computed from the Vidyanidhi profile (district, gender, income, course, institution type, year, marks) plus a few extra questions such as community or disability. Results show as Eligible, May be eligible or Not eligible, with the reason.
- Students mark schemes saved, applied or received. Deadline reminders come by email at window opening and 14 and 3 days before closing.
- With the student's separate consent, the case file shows their other-scholarship status so the committee can take it into account. Without consent, admins see only totals.

### Career and course guidance (phase 5)
Reuses the same profile (course, stream, marks, future plans). Content is not yet defined, so it is a placeholder until the prepared module is shared.

### Referrals to other Wisdom welfare schemes
- The master admin keeps a list of schemes that accept referrals, with organisation, need types and a named contact. The final list comes from the committee.
- An admin raises a referral from a case: scheme, need (health, housing, family hardship, Zakat need, employment, counselling, other), urgency and a short note. A verifier can flag a need in the visit report and the admin converts it.
- **The candidate, or the guardian of a minor, agrees in the app first.** Only name, contact, district, the need and the note are shared, never documents, scores or bank details.
- The summary goes to the scheme's contact by email. The contact replies by email, and an admin records the status: Referred, Acknowledged, Under consideration, Supported, Not taken up. Referrals unacknowledged after the set number of days are flagged to the admin.

## 12. Data

Grouped, with the main fields:

| Group | Tables |
| --- | --- |
| People | profiles (role, district scope, finance flag, language, active), applicants, family_members |
| Applications | cycles, applications, document_types, documents (type, path, status, reviewer, reason, version) |
| Selection | verifications, events, event_sessions, invitations (reply, slot, token, check-in, attendance), interviews (one per panel member per round), score_items, contact_log, decisions |
| Money | bank_accounts, disbursements, revisions, fund_sources, contributions |
| Renewals and notices | renewals, pending_items, notifications (every email sent and its result) |
| Welfare | schemes, student_schemes, welfare_schemes, referrals |
| Compliance and settings | consents, audit_log, exports_log, settings (score criteria, reminder intervals, retention) |

## 13. Security and DPDP

- Notice and consent at first sign-in, recorded with date. Guardian consent for under-18s. A named grievance contact on the notice.
- Collect the minimum: no Aadhaar numbers. Bank details only after selection.
- Access rules live in the database. A verifier reads only through a function that returns the allowed fields. Files are private and open through links that expire in minutes.
- The bank account number is encrypted in the database, with the key kept in function secrets. All reads go through a function that writes the audit entry.
- Every change to key tables is logged by database triggers. The audit view is for the master admin.
- Passwords are handled by the sign-in service, hashed, and never visible to Wisdom staff. Minimum length 8, email confirmation required before first use, repeated failed attempts are rate-limited, and reset links expire.
- Admins turn on 2-step verification on their Google account. Access is deactivated when a term ends. At least two master admins.
- Retention: documents of non-selected applicants are deleted after a period the committee sets (default 12 months after the cycle closes). Deletion requests are honoured.
- Breach procedure, one page: who is told, how fast, how applicants are informed.

## 14. Build plan

One developer. Weeks are rough.

| Phase | Weeks | Delivers |
| --- | --- | --- |
| 0. Setup | 1 | Supabase project, Google sign-in, sender Gmail account, GitHub and Cloudflare under a Wisdom account, address |
| 1. Applicants | 4 | Sign-in, profile, application form, document checklist and uploads, admin document review, email notices, user management, import of existing applicants |
| 2. Selection | 5 | Verification form, interview events, invitations and replies, check-in and tokens, the three interview forms, contact log, decisions, bank details, sanction letter. **Pilot in one district on a real interview day** |
| 3. Scholars | 4 | Renewals, pending items and reminders, disbursements, revisions, contributions, exports, candidate report, audit view, backup button |
| 4. Referrals and rollout | 2 | Referrals, one-page guides for admins and bearers, full rollout |
| 5. Welfare guidance | about 6, after rollout | Other-scholarships module, career guidance when its content is ready |

Core portal is about **16 weeks.** If the first interview day is earlier than that, build Phase 2's interview features first and keep admission review on the old process for the first meet.

## 15. Moving existing data (once)

1. Export 2026 applicants and active scholars from the current database. Import them with their status and email.
2. Scan paper attachments, name each file `applicationnumber_documenttype.pdf`, and bulk-upload. A review list catches names that do not match.
3. For active scholars, enter score, grade, monthly amount, last renewal date and decision from the paper sheets, and attach the scan. Their next renewal then runs fully in the portal.
4. After the check, no new paper sheets are created.

## 16. Defaults assumed (change any of these)

So nothing waits on a meeting, the build starts on these:

- One document list for all course types, as in section 6, editable later.
- More than one panel member may score; the average is used.
- Fee bands are ranges, taken as the lower bound inclusive.
- Documents stored in Supabase Storage, as above.
- Finance flag held by the master admins and one named finance person.
- Retention of non-selected applicants' documents: 12 months.
- Zakat check off. Revisions need a reason but no approval.
- Verifiers log in with Google. Admins enter reports for those who cannot.

**Only the committee can answer these:**
- What the interview grade means and how it is set from the score. Until then it is typed by the panel.
- The list of Islahi Centres and who records contributions.
- Which Wisdom schemes accept referrals, and a contact for each.
- Wording for consent to share Finder status and referrals.
- Who owns the Google, GitHub and Supabase accounts.

## 17. Risks

| Risk | Handling |
| --- | --- |
| Free limits reached | Section 3 triggers. Supabase Pro is the upgrade, with no redesign. |
| Applicant has no Google account | Email and password sign-up. Admin can still create the record and upload on their behalf. |
| Reset link opens in the phone browser instead of the installed app | Expected on iPhone. The student sets the new password there and then signs in to the app as usual. Stated on the reset email. |
| Sign-in problems in the iPhone home-screen app | Test on iPhones in the pilot. Fallback is using the site in Safari. |
| Fake or mistyped emails | Email confirmation before first use. |
| Emails land in spam | Dedicated sender account, plain messages, a line in the app asking students to check spam and mark as not spam. |
| One developer | Code and accounts under a Wisdom account, with a written handover guide. |
| Committee keeps using paper | Withdraw the paper sheets from the next interview day. Pilot one district first. Give venues a phone or tablet per interviewer. |
