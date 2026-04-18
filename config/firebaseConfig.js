// config/firebaseConfig.js
const admin = require('firebase-admin');
require('dotenv').config();

const rawKey = process.env.FIREBASE_PRIVATE_KEY || '';
console.log('ENV CHECK:', {
  HAS_FIREBASE_PRIVATE_KEY: !!rawKey,
  HAS_FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
  HAS_FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
  KEY_LENGTH: rawKey.length,
  KEY_START: rawKey.substring(0, 40),
  HAS_LITERAL_NEWLINE: rawKey.includes('\\n'),
  HAS_ACTUAL_NEWLINE: rawKey.includes('\n'),
});

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  // Render: full service account JSON stored as a single env var
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (e) {
    // Literal newlines in private key from copy-paste — escape every one and retry
    serviceAccount = JSON.parse(raw.replace(/\r?\n/g, '\\n'));
  }
} else if (process.env.FIREBASE_PRIVATE_KEY) {
  // Individual env vars fallback
  serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${encodeURIComponent(process.env.FIREBASE_CLIENT_EMAIL)}`,
    universe_domain: 'googleapis.com',
  };
} else {
  // Local development fallback — reads serviceAccountKey.json
  const path = require('path');
  const saPath = process.env.FIREBASE_SA_PATH || './serviceAccountKey.json';
  try {
    serviceAccount = require(path.resolve(saPath));
  } catch (e) {
    throw new Error(
      'Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON env var on Render, ' +
      'or place serviceAccountKey.json in the backend root for local development.'
    );
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();
const auth = admin.auth();

module.exports = { admin, db, messaging, auth };

