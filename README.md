# NextGenAI — Static Portfolio & Company Website

> **Intelligent software, built for the next generation**

A fast, zero-framework, static single-page portfolio and company website for **NextGenAI** (HTML, CSS, and Vanilla JavaScript only — zero backend, zero paid services, zero API keys). Ready for free hosting on **Netlify** or **GitHub Pages**.

---

## Folder Structure

```text
.
├── index.html                    # Main single-page website (SEO, JSON-LD, strict CSP)
├── admin.html                    # Optional hidden admin console (OFF by default)
├── netlify.toml                  # Zero-build Netlify hosting & caching headers
├── robots.txt                    # Search engine directives (blocks /admin.html)
├── sitemap.xml                   # Search engine sitemap (update URL placeholder)
├── sw-site.js                    # Lightweight offline-friendly service worker
├── nextgenai-firestore.rules     # Optional Firebase Spark security rules
├── README.md                     # Setup, editing & free deployment guide
├── css/
│   ├── styles.css                # Dark/Light themes, glassmorphism, responsive grid
│   └── admin.css                 # Optional admin console layout styles
├── js/
│   ├── theme-init.js             # Early theme script (prevents dark/light flash)
│   ├── site-data.js              # EDIT ALL CONTENT HERE (brand, contact, stats, projects)
│   ├── firebase-config.js        # Optional Firebase Spark config (enabled: false)
│   ├── app.js                    # Vanilla JS renderer, filters, search, modal, form
│   └── admin.js                  # Optional Firebase Auth + Firestore editor
└── assets/
    ├── logo/                     # NextGenAI logo (128, 256, 512 in WebP + JPG)
    ├── images/                   # Compressed project preview images (WebP + JPG)
    └── favicon/                  # favicon.ico, PNG favicons, Apple icon & manifest
```

---

## Quick Personalization Checklist

Open **`js/site-data.js`** and replace these obvious placeholders:

- `YOUR_EMAIL_HERE` — your contact email (powers **Send Email**, **Copy**, and the contact form)
- `YOUR_PHONE_HERE` — your phone number (powers **Call** and **Copy**)
- `YOUR_WHATSAPP_NUMBER_HERE` — digits with country code, no `+` or spaces (e.g. `923001234567`)
- `YOUR_CITY_COUNTRY_HERE` — your city and country
- `YOUR_EDULEDGER_URL_HERE` and `YOUR_LINK_HERE` — your live project and social URLs (leave any unused link as `""` to hide it cleanly)

Also replace `https://YOUR_SITE_URL_HERE/` in **`index.html`**, **`sitemap.xml`**, and **`robots.txt`** once your free Netlify or GitHub Pages URL is live.

---

## How to Add a New Project (No Coding Needed)

1. Open **`js/site-data.js`** in any text editor (or directly in GitHub’s web editor).
2. Find the `projects: [ ... ]` array.
3. Copy and paste one project object below into the list, update the text, save, and re-upload (or commit to GitHub):

```js
    {
      id: 'my-new-project',
      title: 'My Project Name',
      category: 'Web Apps', // Use "Web Apps", "PWAs", or "Tools"
      shortDescription:
        'A concise 1–2 sentence summary of what this project does.',
      longDescription:
        'A fuller explanation shown inside the Details modal when visitors click Details.',
      highlights: [
        'Key feature or benefit one',
        'Key feature or benefit two',
      ],
      tags: ['Web Apps', 'Offline-first', 'JavaScript'],
      image: './assets/images/my-project.webp', // Optional: leave "" for gradient fallback
      imageFallback: './assets/images/my-project.jpg',
      gallery: [], // Optional extra screenshots for the Details modal
      liveUrl: 'https://my-project.netlify.app', // Optional: leave "" to hide Open App button
      githubUrl: 'https://github.com/username/repo', // Optional: leave "" to hide Source Code button
      status: 'Live', // "Live" | "Beta" | "Coming Soon"
      featured: false, // Set to true to highlight as Featured
    },
```

4. Optional: drop compressed WebP/JPG screenshots into `assets/images/`. If you leave `image: ''`, a styled gradient preview card is shown automatically.

---

## Free Deployment (Zero Paid Domain Required)

> **Note on domains:** A custom domain (`.com` / `.dev`) is completely optional and paid. Both **Netlify** (`nextgenai.netlify.app`) and **GitHub Pages** (`username.github.io/nextgenai/`) give you a free HTTPS address forever.

### Option A — Deploy Free on Netlify (Recommended)

1. Create a free repository on GitHub and upload all files from this folder.
2. Sign in at [app.netlify.com](https://app.netlify.com/) → **Add new site** → **Import an existing project**.
3. Pick your GitHub repository. Leave **Build command** blank and **Publish directory** set to `.` (automatically picked up from `netlify.toml`).
4. Click **Deploy site**. Netlify gives you a free HTTPS URL (`https://your-site.netlify.app`).
5. Every time you edit `js/site-data.js` and push to GitHub, Netlify updates your live site automatically in seconds.

### Option B — Deploy Free on GitHub Pages

1. Push all files to a GitHub repository (for example `nextgenai-site`).
2. Go to **Settings → Pages** in your GitHub repository.
3. Under **Build and deployment**, select **Deploy from a branch**, pick **`main`** and folder **`/ (root)`**, then click **Save**.
4. Your site will be live at `https://<your-username>.github.io/<repo-name>/`. All paths in this project are relative (`./assets/...`), so sub-paths work out of the box.

---

## Optional Free Admin Mode (Firebase Spark Plan — OFF by Default)

The public website runs 100% statically from `js/site-data.js` with no backend. Only follow these steps if you want to edit projects/contact details from `/admin.html`:

1. Create a free **Spark Plan** project in Firebase Console (do not upgrade to Blaze).
2. Enable **Authentication → Sign-in method → Email/Password**, and manually add your admin email and password under **Users**.
3. Create a **Cloud Firestore** database (Production mode).
4. Copy the contents of **`nextgenai-firestore.rules`**, replace `YOUR_ADMIN_EMAIL_HERE` with your admin email, and publish it in **Firestore → Rules**.
5. Open **`js/firebase-config.js`**, paste your Firebase Web App config (`apiKey`, `authDomain`, `projectId`, `appId`), and set `enabled: true`.
6. Visit `/admin.html`, sign in, and manage projects or contact info. If Firestore is ever offline or unreachable, `index.html` automatically falls back to `js/site-data.js`.

---

## Test Checklist

- [ ] **Mobile width (390 px & 125% zoom):** No horizontal scrollbar and zero overlapping text or buttons.
- [ ] **All links & actions:** `mailto:`, `https://wa.me/...`, `tel:`, Copy buttons (with toast), and external project/social links (`rel="noopener noreferrer"`) work cleanly.
- [ ] **Dark / Light theme toggle:** Switches smoothly, maintains crisp contrast, and persists after page reload.
- [ ] **Project filter & search:** Clicking `All`, `Web Apps`, `PWAs`, `Tools` and typing in the search bar filters cards immediately; clicking **Details** opens and closes the modal (including with `Escape`).
- [ ] **Easy editing:** Adding a new object to `projects` in `js/site-data.js` renders a new card immediately on reload.
- [ ] **Offline-friendly & logo persistence:** After first load over HTTPS, the page stays viewable offline via `sw-site.js`, and the NextGenAI logo displays cleanly even after a hard refresh on Netlify.
