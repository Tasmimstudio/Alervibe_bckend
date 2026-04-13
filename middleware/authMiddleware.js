// middleware/authMiddleware.js
const { auth, db } = require('../config/firebaseConfig');

const USERS_COLLECTION = 'users';

// Middleware to authenticate Firebase ID tokens
async function authenticate(req, res, next) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split('Bearer ')[1];

    // Verify the Firebase ID token
    const decodedToken = await auth.verifyIdToken(token);

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      email_verified: decodedToken.email_verified
    };

    // Get user profile from Firestore for role information
    const userDoc = await db.collection(USERS_COLLECTION).doc(decodedToken.uid).get();

    if (userDoc.exists) {
      req.user.profile = userDoc.data();
      req.user.role = userDoc.data().role || 'user';
    } else {
      req.user.role = 'user'; // default role if profile doesn't exist
    }

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Middleware to check if user is admin
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  next();
}

// Middleware to check if user is security personnel
function requireSecurity(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role !== 'security' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Security access required' });
  }

  next();
}

// Middleware to check multiple roles
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireAdmin,
  requireSecurity,
  requireRole
};
