// config/firebaseConfig.js
const admin = require('firebase-admin');
require('dotenv').config();

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON.replace(/\n/g, '\\n');
  serviceAccount = JSON.parse(raw);
} else {
  // Local development fallback
  const path = require('path');
  const saPath = process.env.FIREBASE_SA_PATH || './config/alertvibe-d6892-firebase-adminsdk-fbsvc-1b78c03be3.json';
  serviceAccount = require(path.resolve(saPath));
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();
const auth = admin.auth();

module.exports = { admin, db, messaging, auth };

