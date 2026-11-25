/**
 * ============================================================================
 * NextGenAI — Optional Free Firebase Spark Configuration (OFF BY DEFAULT)
 * ============================================================================
 *
 * The public website works 100% statically from js/site-data.js with ZERO
 * backend and ZERO external API calls.
 *
 * ONLY edit this file if you want to enable the optional /admin.html editor
 * backed by Firebase Authentication (Email/Password) + Cloud Firestore on the
 * free Spark plan (no Blaze plan, no Cloud Functions, no Cloud Storage).
 *
 * Setup steps are documented in README.md ("Optional Free Admin Mode").
 * ============================================================================
 */
window.NEXTGENAI_FIREBASE = {
  // Set to true ONLY after filling your Firebase web app config below
  enabled: false,

  // Firestore document path where /admin.html saves content overrides
  collection: 'site_content',
  documentId: 'main',

  // Paste your Firebase Web App config from Firebase Console -> Project Settings
  config: {
    apiKey: 'YOUR_FIREBASE_API_KEY_HERE',
    authDomain: 'YOUR_PROJECT_ID.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    appId: 'YOUR_FIREBASE_APP_ID_HERE',
  },
};
