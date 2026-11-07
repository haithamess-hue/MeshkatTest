# Meshkat — landing page (MVP)

One page that explains Meshkat to **companies who want to hire** and **product people who want to join**. It works in English and Arabic, has two forms, and sends every answer to a Google Sheet and to your email.

---

## What's in this folder

| File | What it is | Do you edit it? |
|---|---|---|
| `content/en.json` | All English text on the page | **Yes**: this is where you change wording |
| `content/ar.json` | All Arabic text on the page (same keys as English) | **Yes** |
| `content/settings.json` | Calendar link, form link, contact email, LinkedIn, show/hide proof | **Yes** |
| `backend/Code.gs` | The code that saves form answers to Google Sheets and emails you | Only the 2 lines at the top |
| `assets/style.css` | Design. Colors are at the very top | Only if you change colors |
| `assets/logo.svg`, `assets/favicon.svg` | Placeholder logo and browser-tab icon | Replace with the final logo |
| `assets/og-image.png` | Picture shown when the link is shared on WhatsApp, LinkedIn and similar apps | Replace when the brand is final |
| `index.html`, `assets/app.js` | Page structure and behaviour | No |

---

## How to change any text

1. Open `content/en.json` (English) or `content/ar.json` (Arabic).
2. Find the sentence and change only the words **inside the quotes**.
3. Keep the quotes, commas and brackets as they are. If the page goes blank after an edit, a comma or quote is probably missing. Paste the file into <https://jsonlint.com> to find the problem.
4. If you change a sentence in one language, change it in the other one too.

**Choosing the hero headline:** in `en.json` → `hero` → `headlineOptions` there are 3 headlines. The page shows the **first** one. To use a different one, move it to the top of the list. Do the same in `ar.json`.

**Dropdown answers** (role type, level and so on) are under `options`. Change only `label`. Leave `value` in English in both files, so your Google Sheet always gets the same words whatever language the visitor used.

## How to change settings

Open `content/settings.json`:

```json
"formEndpoint": "PASTE_YOUR_APPS_SCRIPT_WEB_APP_URL_HERE",
"calendarUrl":  "PASTE_YOUR_CALENDAR_LINK_HERE",
"contactEmail": "PASTE_YOUR_CONTACT_EMAIL_HERE",
"linkedinUrl":  "PASTE_YOUR_LINKEDIN_PAGE_URL_HERE",
"showProof": false
```

- While a value still starts with `PASTE_`, the page plays it safe:
  - **Form link not set**: the form shows a polite "not connected yet" message instead of losing the answer.
  - **Calendar not set**: the "Book a call" buttons take people to the company form instead.
  - **Email or LinkedIn not set**: that footer link is hidden.
- `showProof`: set it to `true` only after a client approves their name and quote. Then fill in `proof` in both language files.

## Language links

- To share the Arabic page directly, use `https://your-domain.com/?lang=ar`. For English, use `?lang=en`.
- With no `?lang=`, the page shows the visitor's last choice. If there isn't one, it shows Arabic when their phone or browser is set to Arabic, and English otherwise.
- Campaign links work too, for example `?lang=ar&utm_source=linkedin&utm_campaign=launch`. The `utm_*` values are saved with each form answer.

---

## Connect the forms (Google Sheet + email). About 10 minutes, no coding

1. Go to <https://sheets.google.com> and create a **new blank sheet**. Name it, for example, "Meshkat leads".
2. Copy the sheet's **ID** from the address bar. It's the long part between `/d/` and `/edit`:
   `https://docs.google.com/spreadsheets/d/`**`1AbC...xyz`**`/edit`
3. In the sheet's menu, click **Extensions → Apps Script**. A code editor opens in a new tab.
4. Delete everything in the editor. Open `backend/Code.gs` from this folder, copy **all** of it, and paste it in.
5. Near the top, replace:
   - `PASTE_YOUR_SHEET_ID_HERE` with the ID from step 2
   - `PASTE_YOUR_EMAIL_HERE` with the email that should receive new answers

   Keep the quotes around both values.
6. Click the **Save** icon (💾).
7. Optional check: in the function dropdown at the top, pick **`testSetup`**, then click **Run**. Google will ask for permission. Click **Review permissions**, choose your account, then **Advanced → Go to (project name) → Allow**. This screen is normal for your own scripts. It then creates the "Companies" and "Talent" tabs and sends you a test email.
8. Click **Deploy → New deployment**. Click the gear ⚙ next to "Select type" and choose **Web app**. Then set:
   - **Execute as:** Me
   - **Who has access:** Anyone

   Click **Deploy** and allow the permissions if asked.
9. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/.../exec`.
10. Paste it into `content/settings.json` as the value of `"formEndpoint"`, then re-deploy the site (see below).
11. Test it: send each form once from the live site. A new row should appear in the sheet and an email should arrive within a minute.

**If you edit `Code.gs` later:** in Apps Script, go to **Deploy → Manage deployments → ✏️ Edit**, set **Version: New version**, and click **Deploy**. The URL stays the same.

**What gets saved:** each form gets its own tab ("Companies" or "Talent"). The tab is created with a header row the first time it's needed. Each row holds the time (Amman time), every answer, the visitor's language, the UTM values and the page URL. Spam bots that fill in the hidden trap field are silently ignored.

---

## Put the site online (free)

### Option A: Netlify drag and drop (easiest)
1. Go to <https://app.netlify.com/drop> and sign up for free.
2. Drag this **whole folder** onto the page.
3. You get a link like `random-name.netlify.app`. Rename it under **Site configuration → Change site name**.
4. To update the site later: **Deploys → drag the folder in again**.
5. Custom domain: go to **Domain management → Add a domain** and follow the steps.

### Option B: Vercel (if the code is on GitHub)
1. Go to <https://vercel.com>, sign in with GitHub, and click **Add New → Project**.
2. Pick this repository. Framework preset: **Other**. Leave the build settings empty, then click **Deploy**.
3. Every change pushed to GitHub updates the site automatically.

(Netlify can also connect to GitHub the same way: **Add new site → Import an existing project**.)

### Preview on your own computer
Opening `index.html` by double-clicking **won't load the text**, because browsers block that for safety. Instead, open a terminal in this folder and run:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

---

## Before launch (every placeholder)

- [ ] **Form link**: `content/settings.json` → `formEndpoint` (see "Connect the forms")
- [ ] **Alert email**: `backend/Code.gs` → `NOTIFY_EMAIL`
- [ ] **Sheet ID**: `backend/Code.gs` → `SHEET_ID`
- [ ] **Calendar link** (Calendly / Cal.com / Google Calendar): `settings.json` → `calendarUrl`
- [ ] **Contact email** for the footer: `settings.json` → `contactEmail`
- [ ] **LinkedIn link** for the footer: `settings.json` → `linkedinUrl`
- [ ] **Final headline**: pick from the 3 options in `hero.headlineOptions` (move it to the top, in both languages)
- [ ] **Native review of the Arabic copy**: all of `content/ar.json` (written in natural modern Arabic, but not yet reviewed by a native editor)
- [ ] **Client proof**: kept hidden (`showProof: false`). To show it, get approval, fill in `proof` in both files, and set `showProof` to `true`. Never use invented quotes.
- [ ] **Logo**: replace `assets/logo.svg`, `assets/favicon.svg`, `assets/favicon-32.png` and `assets/apple-touch-icon.png`
- [ ] **Brand colors**: the top of `assets/style.css` (currently navy `#0f1f3d` with amber `#e0a526`)
- [ ] **Share image**: replace `assets/og-image.png` (1200×630) with the final brand
- [ ] **Domain name**: connect it in Netlify or Vercel. After that, in `index.html` change `content="assets/og-image.png"` to the full address, for example `content="https://meshkat.co/assets/og-image.png"`, so the share picture works everywhere.
- [ ] **Roles covered**: the page says product roles only (product manager, product designer, product engineer). Change the copy if this changes.

## Good to know

- Link previews (WhatsApp, LinkedIn) always use the **English** title, description and image written in `index.html`, because those apps don't run the page's code. Visitors still see Arabic on the page itself.
- Form answers are sent with a "fire and forget" request (this is how Google Apps Script works with websites). The visitor sees "Thanks" once the request leaves their browser. That's why step 11 above, a real test of each form, matters.
- CV file uploads, logins and dashboards are out of scope for this version on purpose.
