// controllers/userController.js
const { db, auth } = require('../config/firebaseConfig');

const USERS_COLLECTION = 'users';

// Create a new user profile in Firestore
async function createUser(req, res, next) {
  try {
    const { uid, email, displayName, phoneNumber, photoURL } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: 'uid and email are required' });
    }

    const userData = {
      uid,
      email,
      displayName: displayName || null,
      phoneNumber: phoneNumber || null,
      photoURL: photoURL || null,
      role: 'user', // default role
      active: true,
      createdAt: db.FieldValue ? db.FieldValue.serverTimestamp() : new Date(),
      updatedAt: db.FieldValue ? db.FieldValue.serverTimestamp() : new Date()
    };

    await db.collection(USERS_COLLECTION).doc(uid).set(userData);

    res.status(201).json({ message: 'User created successfully', user: userData });
  } catch (err) {
    next(err);
  }
}

// Get user profile
async function getProfile(req, res, next) {
  try {
    const uid = req.user.uid; // from auth middleware

    const doc = await db.collection(USERS_COLLECTION).doc(uid).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    next(err);
  }
}

// Update user profile
async function updateProfile(req, res, next) {
  try {
    const uid = req.user.uid; // from auth middleware
    const { displayName, phoneNumber, photoURL } = req.body;

    const updateData = {
      updatedAt: db.FieldValue ? db.FieldValue.serverTimestamp() : new Date()
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;
    if (photoURL !== undefined) updateData.photoURL = photoURL;

    await db.collection(USERS_COLLECTION).doc(uid).update(updateData);

    res.json({ message: 'Profile updated successfully' });
  } catch (err) {
    next(err);
  }
}

// Get user by ID (admin can view any user)
async function getUserById(req, res, next) {
  try {
    const { id } = req.params;

    const doc = await db.collection(USERS_COLLECTION).doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (err) {
    next(err);
  }
}

// List all users (paginated)
async function listUsers(req, res, next) {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const snapshot = await db.collection(USERS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .offset(offset)
      .get();

    const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ users, count: users.length });
  } catch (err) {
    next(err);
  }
}

// Verify Firebase ID token and get user info
async function verifyToken(req, res, next) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token required' });
    }

    const decodedToken = await auth.verifyIdToken(token);

    // Get user from Firestore
    const userDoc = await db.collection(USERS_COLLECTION).doc(decodedToken.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    res.json({
      uid: decodedToken.uid,
      email: decodedToken.email,
      profile: userDoc.data()
    });
  } catch (err) {
    next(err);
  }
}

// Bootstrap first admin - only works when no admins exist
async function setupAdmin(req, res, next) {
  try {
    const { uid, email, displayName, setupKey } = req.body;

    // Require a setup key for security (should be set in environment)
    const validSetupKey = process.env.ADMIN_SETUP_KEY || 'alertvibe-admin-setup-2024';
    if (setupKey !== validSetupKey) {
      return res.status(403).json({ error: 'Invalid setup key' });
    }

    if (!uid || !email) {
      return res.status(400).json({ error: 'uid and email are required' });
    }

    // Check if any admin already exists
    const adminSnapshot = await db.collection(USERS_COLLECTION)
      .where('role', '==', 'admin')
      .limit(1)
      .get();

    if (!adminSnapshot.empty) {
      return res.status(400).json({
        error: 'Admin already exists. Use admin panel to create more admins.',
        hint: 'Contact existing admin to grant admin access'
      });
    }

    // Create the first admin user
    const adminData = {
      uid,
      email,
      displayName: displayName || 'System Admin',
      phoneNumber: null,
      photoURL: null,
      role: 'admin',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection(USERS_COLLECTION).doc(uid).set(adminData);

    // Set custom claims in Firebase Auth
    await auth.setCustomUserClaims(uid, { role: 'admin' });

    res.status(201).json({
      message: 'Admin user created successfully',
      user: adminData
    });
  } catch (err) {
    next(err);
  }
}

// Create user with specific role (admin only)
async function createUserWithRole(req, res, next) {
  try {
    const { email, password, displayName, phoneNumber, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const validRoles = ['user', 'security', 'admin'];
    const userRole = validRoles.includes(role) ? role : 'user';

    // Only admins can create security or admin users
    if ((userRole === 'security' || userRole === 'admin') && req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create security or admin users' });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: displayName || null,
    });

    const userData = {
      uid: userRecord.uid,
      email,
      displayName: displayName || null,
      phoneNumber: phoneNumber || null,
      photoURL: null,
      role: userRole,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection(USERS_COLLECTION).doc(userRecord.uid).set(userData);

    // Set custom claims in Firebase Auth
    await auth.setCustomUserClaims(userRecord.uid, { role: userRole });

    res.status(201).json({
      message: `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} user created successfully`,
      user: userData
    });
  } catch (err) {
    next(err);
  }
}

// Get current user's role
async function getRole(req, res, next) {
  try {
    const uid = req.user.uid;
    const doc = await db.collection(USERS_COLLECTION).doc(uid).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userData = doc.data();
    res.json({
      uid,
      role: userData.role || 'user',
      active: userData.active !== false
    });
  } catch (err) {
    next(err);
  }
}

// Upload profile photo to Cloudinary and update photoURL
async function uploadProfilePhoto(req, res, next) {
  try {
    const uid = req.user.uid;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const photoURL = req.file.path; // Cloudinary URL from multer-storage-cloudinary

    await db.collection(USERS_COLLECTION).doc(uid).update({
      photoURL,
      updatedAt: db.FieldValue ? db.FieldValue.serverTimestamp() : new Date()
    });

    res.json({ message: 'Profile photo uploaded successfully', photoURL });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createUser,
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  getUserById,
  listUsers,
  verifyToken,
  setupAdmin,
  createUserWithRole,
  getRole
};