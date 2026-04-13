// config/firebaseConfig.js
const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

const serviceAccountPath = process.env.FIREBASE_SA_PATH || './config/alertvibe-d6892-firebase-adminsdk-fbsvc-1b78c03be3.json';
const serviceAccount = require(path.resolve(serviceAccountPath));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const messaging = admin.messaging();
const auth = admin.auth();

module.exports = { admin, db, messaging, auth };

