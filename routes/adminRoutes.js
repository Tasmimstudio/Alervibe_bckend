// routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/adminController');
const { authenticate, requireAdmin, requireRole } = require('../middleware/authMiddleware');

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireAdmin);

// Dashboard & Statistics
router.get('/dashboard', controller.getDashboardStats);        // GET /api/admin/dashboard

// User Management
router.get('/users', controller.getAllUsers);                  // GET /api/admin/users
router.put('/users/:userId/role', controller.updateUserRole);  // PUT /api/admin/users/:userId/role
router.put('/users/:userId/status', controller.toggleUserStatus); // PUT /api/admin/users/:userId/status
router.delete('/users/:userId', controller.deleteUser);        // DELETE /api/admin/users/:userId

// Alert Management
router.get('/alerts', controller.getAllAlerts);                // GET /api/admin/alerts
router.put('/alerts/:alertId/respond', controller.markAlertResponded); // PUT /api/admin/alerts/:alertId/respond
router.post('/alerts/bulk-delete', controller.bulkDeleteAlerts); // POST /api/admin/alerts/bulk-delete

// System Logs
router.get('/logs', controller.getSystemLogs);                 // GET /api/admin/logs

module.exports = router;
