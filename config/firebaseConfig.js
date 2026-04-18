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

function fixPrivateKey(key) {
  if (!key) return key;
  // Step 1: if there are actual newlines already, the key may be fine — but also
  // check it has PEM headers. If not, something is badly wrong.
  // Step 2: replace any literal \n (two chars: backslash + n) with real newlines.
  let fixed = key.replace(/\\n/g, '\n');
  // Step 3: if the key is still a single line (no newlines), try reformatting the
  // raw base64 into proper 64-char PEM lines.
  if (!fixed.includes('\n')) {
    const match = fixed.match(/-----BEGIN PRIVATE KEY-----([\s\S]*?)-----END PRIVATE KEY-----/);
    if (match) {
      const b64 = match[1].replace(/\s+/g, '');
      const lines = (b64.match(/.{1,64}/g) || []).join('\n');
      fixed = `-----BEGIN PRIVATE KEY-----\n${lines}\n-----END PRIVATE KEY-----\n`;
    }
  }
  return fixed;
}

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  // Render: full service account JSON stored as a single env var
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  try {
    serviceAccount = JSON.parse(raw);
  } catch (e) {
    // Literal/actual newlines inside the JSON string — escape them and retry
    serviceAccount = JSON.parse(raw.replace(/\r?\n/g, '\\n'));
  }
  // Normalize the private key regardless of which parse path was taken
  if (serviceAccount.private_key) {
    serviceAccount.private_key = fixPrivateKey(serviceAccount.private_key);
    console.log('PRIVATE KEY CHECK:', {
      length: serviceAccount.private_key.length,
      hasHeader: serviceAccount.private_key.includes('-----BEGIN PRIVATE KEY-----'),
      hasFooter: serviceAccount.private_key.includes('-----END PRIVATE KEY-----'),
      hasNewlines: serviceAccount.private_key.includes('\n'),
      lineCount: serviceAccount.private_key.split('\n').length,
    });
  }
} else if (process.env.FIREBASE_PRIVATE_KEY) {
  // Individual env vars fallback
  serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: fixPrivateKey(process.env.FIREBASE_PRIVATE_KEY),
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
