// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { db, auth } = require('./config/firebaseConfig');

const alertRoutes = require('./routes/alertRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const securityRoutes = require('./routes/securityRoutes');
const motorcycleRoutes = require('./routes/motorcycleRoutes');

// Create default admin account
async function createDefaultAdmin() {
  const ADMIN_EMAIL = 'admin@alertvibe.com';
  const ADMIN_PASSWORD = 'admin123';
  const ADMIN_NAME = 'System Admin';

  try {
    // Check if admin already exists in Firestore
    const usersRef = db.collection('users');
    const adminQuery = await usersRef.where('role', '==', 'admin').limit(1).get();

    if (!adminQuery.empty) {
      console.log('Admin already exists, skipping creation');
      return;
    }

    // Try to get existing user or create new one
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(ADMIN_EMAIL);
      console.log('Admin auth user already exists');
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create new admin user in Firebase Auth
        userRecord = await auth.createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          displayName: ADMIN_NAME,
        });
        console.log('Created admin auth user');
      } else {
        throw error;
      }
    }

    // Create admin profile in Firestore
    await usersRef.doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: ADMIN_EMAIL,
      displayName: ADMIN_NAME,
      role: 'admin',
      active: true,
      createdAt: new Date(),
    });

    console.log('=========================================');
    console.log('DEFAULT ADMIN ACCOUNT CREATED:');
    console.log('Email: admin@alertvibe.com');
    console.log('Password: admin123');
    console.log('=========================================');
  } catch (error) {
    console.error('Error creating default admin:', error.message);
  }
}

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.get('/', (req, res) => res.send('ALERTVIBE Backend running'));

app.use('/api/alerts', alertRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/motorcycles', motorcycleRoutes);

// error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});

const PORT = process.env.PORT || 4000;

// Create admin before starting server
createDefaultAdmin().then(() => {
  app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
}).catch(err => {
  console.error('Failed to create admin:', err);
  app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
  });
});
