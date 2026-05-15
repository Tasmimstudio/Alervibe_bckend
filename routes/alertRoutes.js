// routes/alertRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/alertController');
const { authenticate } = require('../middleware/authMiddleware');

router.post('/', controller.createAlert);                   // POST /api/alerts  (no auth — ESP32 device)
router.post('/send-alert', controller.sendAlert);           // POST /api/alerts/send-alert
router.post('/save-token', controller.saveToken);           // POST /api/alerts/save-token
router.get('/', authenticate, controller.listAlerts);       // GET  /api/alerts  (auth required — filters by role)
router.get('/:id', authenticate, controller.getAlert);      // GET  /api/alerts/:id
router.delete('/:id', authenticate, controller.deleteAlert); // DELETE /api/alerts/:id

module.exports = router;
