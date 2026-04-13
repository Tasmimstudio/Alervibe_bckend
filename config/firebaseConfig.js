// config/firebaseConfig.js
const admin = require('firebase-admin');
require('dotenv').config();

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (e) {
    serviceAccount = JSON.parse(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON.replace(/\n/g, '\\n')
    );
  }
  // Ensure private key has actual newlines (not escaped \n text)
  if (serviceAccount.private_key) {
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
  }
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

