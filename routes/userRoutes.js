// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');
const { profilePhoto } = require('../middleware/upload');

// Public routes
router.post('/', controller.createUser);              // POST /api/users - create user profile
router.post('/verify-token', controller.verifyToken); // POST /api/users/verify-token
router.post('/setup-admin', controller.setupAdmin);   // POST /api/users/setup-admin - bootstrap first admin

// Protected routes (require authentication)
router.get('/profile', authenticate, controller.getProfile);        // GET /api/users/profile
router.put('/profile', authenticate, controller.updateProfile);     // PUT /api/users/profile
router.put('/profile/photo', authenticate, profilePhoto.single('photo'), controller.uploadProfilePhoto); // PUT /api/users/profile/photo
router.get('/role', authenticate, controller.getRole);              // GET /api/users/role - get current user's role
router.get('/:id', authenticate, controller.getUserById);           // GET /api/users/:id
router.get('/', authenticate, controller.listUsers);                // GET /api/users

// Admin only routes
router.post('/create-with-role', authenticate, requireAdmin, controller.createUserWithRole); // POST /api/users/create-with-role

module.exports = router;
