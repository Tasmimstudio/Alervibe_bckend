// controllers/adminController.js
const { db, auth, admin } = require('../config/firebaseConfig');
const { FieldPath } = require('firebase-admin/firestore');

const USERS_COLLECTION = 'users';
const ALERTS_COLLECTION = 'alerts';

// Get dashboard statistics
async function getDashboardStats(req, res, next) {
  try {
    // Get total users count
    const usersSnapshot = await db.collection(USERS_COLLECTION).get();
    const totalUsers = usersSnapshot.size;

    // Get total alerts count
    const alertsSnapshot = await db.collection(ALERTS_COLLECTION).get();
    const totalAlerts = alertsSnapshot.size;

    // Get unresponded alerts count
    const unrespondedAlertsSnapshot = await db.collection(ALERTS_COLLECTION)
      .where('responded', '==', false)
      .get();
    const unrespondedAlerts = unrespondedAlertsSnapshot.size;

    // Get alerts from last 24 hours
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentAlertsSnapshot = await db.collection(ALERTS_COLLECTION)
      .where('timestamp', '>=', yesterday)
      .get();
    const recentAlerts = recentAlertsSnapshot.size;

    // Get user role breakdown
    const usersByRole = {};
    usersSnapshot.docs.forEach(doc => {
      const role = doc.data().role || 'user';
      usersByRole[role] = (usersByRole[role] || 0) + 1;
    });

    res.json({
      users: {
        total: totalUsers,
        byRole: usersByRole
      },
      alerts: {
        total: totalAlerts,
        unresponded: unrespondedAlerts,
        last24Hours: recentAlerts
      },
      timestamp: new Date()
    });
  } catch (err) {
    next(err);
  }
}

// Update user role
async function updateUserRole(req, res, next) {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    const validRoles = ['user', 'security', 'admin'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        error: 'Invalid role',
        validRoles
      });
    }

    // Prevent user from removing their own admin role
    if (userId === req.user.uid && role !== 'admin') {
      return res.status(400).json({
        error: 'Cannot remove your own admin role'
      });
    }

    await db.collection(USERS_COLLECTION).doc(userId).update({
      role,
      updatedAt: db.FieldValue ? db.FieldValue.serverTimestamp() : new Date()
    });

    // Set custom claims in Firebase Auth
    await auth.setCustomUserClaims(userId, { role });

    res.json({ message: 'User role updated successfully', userId, role });
  } catch (err) {
    next(err);
  }
}

// Activate/Deactivate user
async function toggleUserStatus(req, res, next) {
  try {
    const { userId } = req.params;
    const { active } = req.body;

    if (typeof active !== 'boolean') {
      return res.status(400).json({ error: 'active must be a boolean' });
    }

    // Prevent user from deactivating themselves
    if (userId === req.user.uid && !active) {
      return res.status(400).json({
        error: 'Cannot deactivate your own account'
      });
    }

    await db.collection(USERS_COLLECTION).doc(userId).update({
      active,
      updatedAt: db.FieldValue ? db.FieldValue.serverTimestamp() : new Date()
    });

    // Disable/Enable user in Firebase Auth
    await auth.updateUser(userId, { disabled: !active });

    res.json({
      message: `User ${active ? 'activated' : 'deactivated'} successfully`,
      userId,
      active
    });
  } catch (err) {
    next(err);
  }
}

// Delete user
async function deleteUser(req, res, next) {
  try {
    const { userId } = req.params;

    // Prevent user from deleting themselves
    if (userId === req.user.uid) {
      return res.status(400).json({
        error: 'Cannot delete your own account'
      });
    }

    // Delete from Firestore
    await db.collection(USERS_COLLECTION).doc(userId).delete();

    // Delete from Firebase Auth
    await auth.deleteUser(userId);

    res.json({ message: 'User deleted successfully', userId });
  } catch (err) {
    next(err);
  }
}

// Get all users with filters
async function getAllUsers(req, res, next) {
  try {
    const { role, active, limit = 100, offset = 0 } = req.query;

    let query = db.collection(USERS_COLLECTION);

    // Apply filters
    if (role) {
      query = query.where('role', '==', role);
    }

    if (active !== undefined) {
      query = query.where('active', '==', active === 'true');
    }

    // Apply pagination
    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ users, count: users.length });
  } catch (err) {
    next(err);
  }
}

// Get all alerts with advanced filters
async function getAllAlerts(req, res, next) {
  try {
    const { deviceId, severity, responded, limit = 100, offset = 0 } = req.query;

    let query = db.collection(ALERTS_COLLECTION);

    // Apply filters
    if (deviceId) {
      query = query.where('deviceId', '==', deviceId);
    }

    if (severity) {
      query = query.where('severity', '==', severity);
    }

    if (responded !== undefined) {
      query = query.where('responded', '==', responded === 'true');
    }

    // Apply pagination
    const snapshot = await query
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json({ alerts, count: alerts.length });
  } catch (err) {
    next(err);
  }
}

// Mark alert as responded (or undo response)
async function markAlertResponded(req, res, next) {
  try {
    const { alertId } = req.params;
    const { responded = true, respondedBy, notes } = req.body;
    const serverTimestamp = admin.firestore.FieldValue.serverTimestamp();

    let updateData;

    if (responded) {
      // Mark as responded
      updateData = {
        responded: true,
        respondedAt: serverTimestamp,
        respondedBy: respondedBy || req.user.uid,
        notes: notes || '',
        updatedAt: serverTimestamp,
      };
    } else {
      // Undo response — clear all response fields
      updateData = {
        responded: false,
        respondedAt: null,
        respondedBy: null,
        notes: '',
        updatedAt: serverTimestamp,
      };
    }

    await db.collection(ALERTS_COLLECTION).doc(alertId).update(updateData);

    res.json({ message: responded ? 'Alert marked as responded' : 'Alert response undone', alertId });
  } catch (err) {
    next(err);
  }
}

// Bulk delete alerts
async function bulkDeleteAlerts(req, res, next) {
  try {
    const { alertIds } = req.body;

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      return res.status(400).json({ error: 'alertIds must be a non-empty array' });
    }

    // Delete in batches (Firestore limit is 500 operations per batch)
    const batch = db.batch();
    alertIds.forEach(id => {
      batch.delete(db.collection(ALERTS_COLLECTION).doc(id));
    });

    await batch.commit();

    res.json({
      message: 'Alerts deleted successfully',
      count: alertIds.length
    });
  } catch (err) {
    next(err);
  }
}

// Get system logs (you can implement this based on your logging system)
async function getSystemLogs(req, res, next) {
  try {
    const { limit = 50, offset = 0 } = req.query;

    // This is a placeholder - implement based on your logging system
    // For now, we'll return recent alerts as a proxy for system activity

    const snapshot = await db.collection(ALERTS_COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(parseInt(limit))
      .offset(parseInt(offset))
      .get();

    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      type: 'alert',
      ...doc.data()
    }));

    res.json({ logs, count: logs.length });
  } catch (err) {
    next(err);
  }
}

// Get motorcycles enriched with owner contact info (phone, email)
async function getMotorcyclesWithOwners(req, res, next) {
  try {
    const motorcyclesSnapshot = await db.collection('motorcycles')
      .orderBy('createdAt', 'desc')
      .get();

    const motorcycles = motorcyclesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Collect unique ownerIds
    const ownerIds = [...new Set(
      motorcycles.map(m => m.ownerId).filter(Boolean)
    )];

    // Batch-fetch owner details
    const ownerMap = {};
    if (ownerIds.length > 0) {
      // Firestore 'in' queries support max 30 items per batch
      const batches = [];
      for (let i = 0; i < ownerIds.length; i += 30) {
        batches.push(ownerIds.slice(i, i + 30));
      }

      for (const batch of batches) {
        const usersSnapshot = await db.collection(USERS_COLLECTION)
          .where(FieldPath.documentId(), 'in', batch)
          .get();
        usersSnapshot.docs.forEach(doc => {
          const data = doc.data();
          ownerMap[doc.id] = {
            phoneNumber: data.phoneNumber || null,
            email: data.email || null,
            displayName: data.displayName || data.name || null
          };
        });
      }
    }

    // Enrich motorcycles with owner contact info
    const enriched = motorcycles.map(m => ({
      ...m,
      ownerPhone: ownerMap[m.ownerId]?.phoneNumber || null,
      ownerEmail: ownerMap[m.ownerId]?.email || null,
      ownerName: m.ownerName || ownerMap[m.ownerId]?.displayName || 'Unknown'
    }));

    res.json({ motorcycles: enriched, count: enriched.length });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats,
  updateUserRole,
  toggleUserStatus,
  deleteUser,
  getAllUsers,
  getAllAlerts,
  markAlertResponded,
  bulkDeleteAlerts,
  getSystemLogs,
  getMotorcyclesWithOwners
};
