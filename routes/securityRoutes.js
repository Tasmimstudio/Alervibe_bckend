// routes/securityRoutes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, requireSecurity } = require('../middleware/authMiddleware');

// All security routes require authentication and security/admin role
router.use(authenticate);
router.use(requireSecurity);

// Security personnel can view and respond to alerts
router.get('/alerts', adminController.getAllAlerts);           // GET /api/security/alerts
router.put('/alerts/:alertId/respond', adminController.markAlertResponded); // PUT /api/security/alerts/:alertId/respond

// Motorcycles enriched with owner contact info
router.get('/motorcycles', adminController.getMotorcyclesWithOwners); // GET /api/security/motorcycles

// Security dashboard with basic stats
router.get('/dashboard', adminController.getDashboardStats);   // GET /api/security/dashboard

module.exports = router;
