// controllers/alertController.js
const { db, messaging } = require('../config/firebaseConfig');

const ALERTS_COLLECTION = 'alerts';
const TOKENS_COLLECTION = 'fcm_tokens';

async function createAlert(req, res, next) {
  try {
    const { deviceId, message = 'Vibration detected', severity = 'high', meta = {} } = req.body;
    if (!deviceId) return res.status(400).json({ error: 'deviceId required' });

    const data = {
      deviceId,
      message,
      severity,
      meta,
      responded: false,
      timestamp: db.FieldValue ? db.FieldValue.serverTimestamp() : new Date()
    };

    // Add to Firestore
    const docRef = await db.collection(ALERTS_COLLECTION).add(data);

    // Send FCM - here we broadcast to a topic "security"
    const payload = {
      notification: {
        title: 'ALERTVIBE - Possible Tampering',
        body: message
      },
      data: {
        deviceId,
        alertId: docRef.id
      },
      topic: 'security'
    };

    try {
      await messaging.send(payload);
    } catch (fcmErr) {
      console.warn('FCM send failed', fcmErr.message || fcmErr);
    }

    return res.status(201).json({ id: docRef.id });
  } catch (err) { next(err); }
}

async function listAlerts(req, res, next) {
  try {
    const snap = await db.collection(ALERTS_COLLECTION).orderBy('timestamp', 'desc').limit(200).get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json(items);
  } catch (err) { next(err); }
}

async function getAlert(req, res, next) {
  try {
    const id = req.params.id;
    const doc = await db.collection(ALERTS_COLLECTION).doc(id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) { next(err); }
}

async function deleteAlert(req, res, next) {
  try {
    const id = req.params.id;
    await db.collection(ALERTS_COLLECTION).doc(id).delete();
    res.json({ ok: true });
  } catch (err) { next(err); }
}

async function sendAlert(req, res, next) {
  try {
    const { token, title, body } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Device token required' });
    }

    const message = {
      notification: {
        title: title || '🚨 AlertVibe Triggered!',
        body: body || 'Unusual vibration detected on your motorcycle!'
      },
      token: token
    };

    const response = await messaging.send(message);
    res.json({ success: true, messageId: response });
  } catch (err) {
    console.error('FCM send error:', err);
    next(err);
  }
}

async function saveToken(req, res, next) {
  try {
    const { token, deviceId, userId } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const data = {
      token,
      deviceId: deviceId || null,
      userId: userId || null,
      createdAt: db.FieldValue ? db.FieldValue.serverTimestamp() : new Date(),
      updatedAt: db.FieldValue ? db.FieldValue.serverTimestamp() : new Date()
    };

    // Save token to Firestore (using token as document ID to prevent duplicates)
    await db.collection(TOKENS_COLLECTION).doc(token).set(data, { merge: true });

    console.log('Token saved:', token);
    res.json({ message: 'Token saved successfully' });
  } catch (err) {
    console.error('Error saving token:', err);
    next(err);
  }
}

module.exports = { createAlert, listAlerts, getAlert, deleteAlert, sendAlert, saveToken };
