# Vidyanidhi portal – setup and deploy

## Live now

| Site | Address | Cloudflare project |
| --- | --- | --- |
| Landing page | https://wsvidyanidhi.pages.dev | wsvidyanidhi |
| Applicant portal | https://wsvidyanidhi-apply.pages.dev | wsvidyanidhi-apply |
| Admin portal | https://wsvidyanidhi-admin.pages.dev | wsvidyanidhi-admin |

Every push to the `main` branch on GitHub (khabilcv-a11y/wsvidyanidhi) rebuilds and publishes all three automatically.
The portals show "Opening soon" until the Google backend address is added to their `public/config.js` (step 2 below).

## How it fits together

| Part | Where it runs | Folder |
| --- | --- | --- |
| Landing page (public home) | Cloudflare Pages | `landing/` |
| Applicant portal | Cloudflare Pages | `applicant-portal/` |
| Admin (committee) portal | Cloudflare Pages | `admin-portal/` |
| Backend (all rules and access control) | Google Apps Script web app | `backend/` |
| Data | One Google Sheet, created by the backend | |
| Documents | A private Google Drive folder, created by the backend | |
| Code | GitHub | whole repo |

All three sites call the same backend. The backend is the only thing that can read the Sheet and Drive.
Use a **Wisdom organisation Google account** to own the script, the Sheet and the Drive folders, not a personal one.

## 1. Try it on your computer (no accounts needed)

Needs Node.js. In the project folder, run each in its own terminal:

```bash
npm install
npm run backend:dev     # fake Sheets/Drive/Gmail, saved in backend/.devdata
npm run dev:landing     # http://localhost:5170
npm run dev:applicant   # http://localhost:5173
npm run dev:admin       # http://localhost:5174
```

- Sign in as committee on the admin portal with the developer sign-in using `master@example.org`.
- Emails are not sent in this mode. Sign-up and reset codes appear on the screen as "Dev only", and the other emails are printed in the backend terminal.
- Check the backend rules any time with `npm run backend:test`.

## 2. Create the real backend (Google)

1. Sign in to Google as the Wisdom account. Open **script.google.com**, **New project**, name it "Vidyanidhi API".
2. Run `npm run backend:bundle`. Open `backend/dist/Code.gs`, copy everything, and paste it over the contents of the editor's `Code.gs`.
3. **Project Settings** (gear), tick **Show "appsscript.json" manifest file**. Open that file in the editor and paste in the contents of `backend/dist/appsscript.json`.
4. In the editor pick the function **setup** and press **Run**. Approve the permissions (it will say the app is unverified; this is your own script, so choose Advanced, then continue).
   It creates the Google Sheet, the Documents and Backups folders in Drive, the secrets, the starter data, and the scheduled jobs.
   The account that runs it becomes the first **master admin**. The log shows the Sheet link.
5. **Google sign-in client.** In Google Cloud Console (console.cloud.google.com) create a project, then **APIs & Services → OAuth consent screen** (External, add your app name and email), then **Credentials → Create credentials → OAuth client ID → Web application**.
   Add these **Authorised JavaScript origins**: the applicant portal address, the admin portal address, and `http://localhost:5173` and `http://localhost:5174` while testing. Copy the **Client ID**.
6. Back in the script: **Project Settings → Script properties → Add**: name `GOOGLE_CLIENT_ID`, value the Client ID.
7. **Deploy → New deployment → Web app**. Execute as **Me**, who has access **Anyone**. Copy the **Web app URL**.
   After any later change to the code: paste the new `Code.gs`, then **Deploy → Manage deployments → Edit → New version → Deploy**. The URL stays the same.

## 3. Put the code on GitHub

Create a repository under the Wisdom GitHub organisation and push this folder. Commit `package-lock.json`.

## 4. Publish the three sites (Cloudflare Pages)

Create three Pages projects from the same repository (Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git).
Leave the root directory empty and use:

| Project | Build command | Output directory |
| --- | --- | --- |
| landing | `npm ci && npm run build --workspace landing` | `landing/dist` |
| applicant | `npm ci && npm run build --workspace applicant-portal` | `applicant-portal/dist` |
| admin | `npm ci && npm run build --workspace admin-portal` | `admin-portal/dist` |

Then edit `public/config.js` in each of `landing`, `applicant-portal` and `admin-portal` with the real addresses
(`apiUrl` = the Web app URL, `googleClientId` = the Client ID, and the portal and landing addresses) and push.
Changing `config.js` does not need a rebuild of code, only a redeploy.

**Addresses.** Start with the free `*.pages.dev` addresses. To use your own, add each as a custom domain in the Pages project
and create the CNAME record Cloudflare shows. A sensible layout: `scholarship.wisdomislam.org` for the landing page,
and two sub-addresses for the portals. Add the final addresses to the OAuth client's authorised origins (step 2.5).

## 5. First sign-in

Open the admin portal and continue with the Google account that ran `setup()`. You are the master admin.
Open **Staff**, add a second master admin, then the admins, field verifiers and their districts.

## Things to know

- **Email limit.** A normal Gmail account lets the script send about 100 emails a day (Google Workspace allows far more, and Google Workspace for Nonprofits is free).
  Sign-in codes are sent straight away. Everything else (confirmations, requests, reminders) is queued and sent in batches between 07:00 and 21:00 India time, so a large batch of invitations or reminders can take a few days on a normal Gmail account.
- **Speed.** Each action takes about one to three seconds, because the Sheet is the database. It suits a few thousand applicants; for much more, move the data to a real database later. The backend code is separate from the storage, so this is possible without rewriting the screens.
- **Backups.** A copy of the Sheet is saved to the Backups folder every Sunday (last 8 kept). Sheet version history also works. Do not edit the Sheet by hand while people are using the portal.
- **Security.** All access rules live in the backend code. Keep the Google account's 2-step verification on, keep the script and Sheet private, and give edit access to as few people as possible. Staff sign in with Google only. Password sign-in for applicants is hashed, rate-limited, and confirmed by emailed code.
- **Files.** Documents are limited to 2 MB (photos are shrunk on the phone) and are stored privately in Drive. They are shown only through the portal and every committee view is logged.
- **Malayalam.** The Malayalam text is a first draft for the committee to review.

## What exists now and what is next

Built: landing page, applicant sign-up and sign-in (Google, or email with codes and password reset), consent, application form with autosave,
document checklist, admin case review (accept or ask to re-upload with a reason), staff and district scope, audit log, email queue, reminders, weekly backup.

Planned in the working plan and not built yet: field verification, interviews and the Intellectual Meet, decisions and bank details, renewals,
payments and revisions, contributions, reports and exports, the scholarship finder and career guidance, and referrals.
