# EduLedger — Multi-Device Cloud Sync Upgrade Guide (Firebase Spark 100% Free Tier)

Welcome to **EduLedger Multi-Device Cloud Sync**! This upgrade transitions your School Management & Accounts Progressive Web App (PWA) from local-only storage to **real-time multi-device cloud synchronization**. 

Now, the **Main Admin, Principal, Accounts/Finance, Teachers, and HR** can sign in simultaneously from different devices (Windows PC, Android phones, tablets) and always see the same live, synchronized school records.

---

## ⚡ Strict Free-Tier Architecture (Firebase Spark Plan)

This upgrade is built strictly for the **Firebase Spark Plan ($0/month, No Credit Card Required)**:
- **Zero Cloud Functions**: Sub-account provisioning uses client-side secondary Firebase App instances in the browser so the Main Admin is never logged out.
- **Zero Cloud Storage**: Photos are compressed client-side to small 25-30 KB base64 thumbnails stored inside student documents, staying far below Firestore's 1 MB document limit.
- **Spark Quota Protection**: Attendance is grouped per class per day, and pre-aggregated summaries are used so you comfortably stay within Firebase's 50,000 free reads/day and 20,000 free writes/day.
- **Static Hosting Friendly**: 100% client-side HTML/CSS/TypeScript code deployable to GitHub Pages or Netlify free tiers.

---

## 🚀 Step-by-Step Free Setup (10 Minutes)

### Step 1: Create Your Free Firebase Project
1. Open the [Firebase Console](https://console.firebase.google.com/) and sign in with your Google account.
2. Click **Add project** (or **Create a project**).
3. Enter a project name (e.g., `my-school-ledger`).
4. Disable Google Analytics (optional, saves setup time) and click **Create project**.
5. Ensure your project plan is **Spark (Free)**.

### Step 2: Enable Firebase Authentication (Email/Password)
1. In the Firebase console left menu, go to **Build** → **Authentication**.
2. Click **Get Started**.
3. Under the **Sign-in method** tab, click **Email/Password**.
4. Enable **Email/Password** (leave Email link / passwordless disabled).
5. Click **Save**.

### Step 3: Create Cloud Firestore Database
1. In the Firebase console left menu, go to **Build** → **Firestore Database**.
2. Click **Create database**.
3. Choose a region close to your school (e.g., `asia-south1` or `us-central1`).
4. Select **Start in production mode** (our security rules will protect it) and click **Create**.

### Step 4: Paste Your Web App Configuration
1. Go to **Project Settings** (gear icon next to Project Overview) → **General**.
2. Scroll down to **Your apps** and click the Web icon (`</>`).
3. Enter an app nickname (e.g., `EduLedger Web`) and click **Register app**.
4. Firebase will display your `firebaseConfig` object:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "my-school.firebaseapp.com",
     projectId: "my-school",
     storageBucket: "my-school.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcdef"
   };
   ```
5. You can configure this in **either** of two simple ways:
   - **Method A (Code)**: Open `firebase-config.js` in the root folder and paste your keys into the placeholders.
   - **Method B (App UI)**: Log in as Admin, go to **Settings** → **Cloud Sync (Firebase)** tab, paste the keys into the credentials fields, and click **Save & Connect Cloud**.

### Step 5: Publish Firestore Security Rules
1. In Firebase Console, go to **Firestore Database** → **Rules** tab.
2. Open the file `firestore.rules` included in this repository.
3. Copy its entire content, paste it into the Firebase rules editor, and click **Publish**.

### Step 6: Add Authorized Domains (For GitHub Pages or Netlify)
1. Go to **Authentication** → **Settings** tab → **Authorized domains**.
2. Click **Add domain**.
3. Add your deployment domain:
   - For Netlify: `your-school.netlify.app`
   - For GitHub Pages: `your-username.github.io`
   - For local development: `localhost` is already included by default.

---

## 🔐 How Authentication Works Without Cloud Functions

### 1. Fake Email Mapping
Users simply log in with their **Username** and **Password**. Internally, EduLedger maps this to:
```
username@main.local
```
This enables full Firebase Authentication security without requiring real personal email addresses for young students or school staff.

### 2. Admin Creating Sub-Accounts (Secondary App Pattern)
In a standard Firebase app, calling `createUserWithEmailAndPassword()` immediately logs the current user out. Because the free Spark plan does not permit Cloud Functions, EduLedger uses an isolated **Secondary Firebase App instance in memory**:
1. When the Main Admin creates a new Teacher or Accounts user in **Users & Roles**, EduLedger initializes a temporary secondary app instance in the background.
2. The user is created in Firebase Auth and their profile document is saved in `schools/{schoolId}/users/{uid}` with `forcePasswordChange: true`.
3. The temporary secondary app instance is immediately disposed.
4. **The Main Admin remains 100% logged in without interruption.**

### 3. Password Reset & Admin Reset Flow
- **Security Questions & Recovery Key**: Users can self-reset forgotten passwords by answering their 3 security questions or entering their 16-character Emergency Recovery Key.
- **Admin Password Reset**: The Admin can issue a temporary password for any sub-account from the Users & Roles panel. On next sign-in, the system flags `forcePasswordChange: true` and requires the employee to set their private password before accessing any school data.
- **Firebase Console Emergency Reset**: If a user's account is ever completely inaccessible, the Admin can open Firebase Console → **Authentication** → **Users**, search for `username@main.local`, click the three dots (`...`), and select **Reset password** or **Delete user**.

---

## ☁️ Cloud Database Architecture & Free Quota Protection

All school data is isolated under:
```
/schools/{schoolId}/...
```

| Collection Path | Purpose | Optimization for Free Limits |
| :--- | :--- | :--- |
| `schools/{id}/settings/general` | School profile, currency, academic year | Cached in IndexedDB; updated rarely |
| `schools/{id}/users/{uid}` | User profiles, role, module permissions | Checked on session start |
| `schools/{id}/students/{studentId}` | Student records & photos | Photos compressed to ~25 KB base64 |
| `schools/{id}/attendance/{class_date}` | Grouped Daily Attendance | **1 document per class/day** instead of 1 per student |
| `schools/{id}/feePayments/{paymentId}` | Fee receipts & payment history | Uses atomic batch writes with audit logs |
| `schools/{id}/expenses/{expenseId}` | Operational school expenditures | Synced live across finance screens |
| `schools/{id}/payrollRuns/{runId}` | Monthly staff payroll sheets | Batch generated in chunks of 400 |
| `schools/{id}/activityLogs/{logId}` | Security & operational audit trail | **Write-only**: editing/deleting is forbidden |
| `schools/{id}/summaries/dashboard` | Pre-calculated school counters | Prevents querying thousands of docs |

---

## 📲 Multi-Device Testing Script

### Test 1: Real-Time Sync Between PC & Android Phone
1. Open EduLedger on your **Windows PC** and sign in as **Admin**.
2. Open EduLedger on your **Android phone** browser (or install as PWA) and sign in as **Teacher** or **Accounts**.
3. On the phone, mark today's attendance for a class or record a fee payment.
4. **Result**: Within seconds, the PC screen updates automatically via Firestore's `onSnapshot` real-time listeners without reloading the page.

### Test 2: Offline Operation & Automatic Reconnection
1. On your laptop or phone, turn on **Airplane Mode** (disconnect Wi-Fi and mobile data).
2. The header sync badge changes to **Offline** (with an orange cloud).
3. Add a new expense or mark student attendance.
4. The record is saved immediately into the browser's persistent IndexedDB cache.
5. Turn off Airplane Mode.
6. The header badge switches to **Syncing...** and then **Synced** (green cloud).
7. Check the second device: the offline changes appear seamlessly.

---

## 🛡️ Security Verification Checklist (Roman Urdu / English)

| Check | Expected Behavior | Status |
| :--- | :--- | :--- |
| **Finance Role Isolation** | Accounts/Finance user can collect fees and add expenses, but **CANNOT** approve payroll runs or access the Users & Roles panel. *(Finance user payroll approve nahi kar sakta aur user management nahi kar sakta).* | ✅ Enforced by `firestore.rules` |
| **Teacher Role Isolation** | Teachers can view their class students and submit daily attendance, but **CANNOT** alter fee structures, edit budgets, or delete records. *(Teacher sirf attendance mark kar sakta hai, fees ya budget change nahi kar sakta).* | ✅ Enforced by `firestore.rules` |
| **Audit Log Immutability** | Audit logs can be created by any authenticated staff action, but **CAN NEVER** be edited or deleted by anyone, including the Admin. *(Audit logs tamper-proof hain; koi bhi unhe edit ya delete nahi kar sakta).* | ✅ Enforced by `firestore.rules` |
| **Deactivated Account Lockdown** | If an employee resigns or is deactivated in Users & Roles, their credentials are immediately blocked from logging in or reading Firestore data. *(Deactivated user login nahi kar sakta).* | ✅ Enforced by `firestore.rules` |
| **Non-Negative Financials** | All fee collections, expenses, and salary amounts must be greater than or equal to 0. Negative numbers are rejected at the database level. *(Negative amounts database level par block hain).* | ✅ Enforced by `firestore.rules` |

---

## 🌐 Deploying to GitHub Pages or Netlify

### To Netlify (1-Click Free):
1. Push your repository to GitHub.
2. Sign in to [Netlify](https://www.netlify.com/) and click **Add new site** → **Import an existing project**.
3. Select your repository.
4. Netlify will auto-detect the build settings from our included `netlify.toml`:
   - Build Command: `npm run build`
   - Publish Directory: `dist`
5. Click **Deploy Site**. Add your Netlify URL to Firebase Authorized Domains.

### To GitHub Pages:
1. Ensure your repository has GitHub Pages enabled under **Settings** → **Pages** → Build and deployment from **GitHub Actions** (or `gh-pages` branch).
2. Because EduLedger uses `base: './'`, it works seamlessly whether hosted at root or inside a repository subfolder!
