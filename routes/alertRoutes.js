// routes/alertRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/alertController');

router.post('/', controller.createAlert);        // POST /api/alerts
router.post('/send-alert', controller.sendAlert); // POST /api/alerts/send-alert
router.post('/save-token', controller.saveToken); // POST /api/alerts/save-token
router.get('/', controller.listAlerts);         // GET /api/alerts
router.get('/:id', controller.getAlert);        // GET /api/alerts/:id
router.delete('/:id', controller.deleteAlert); // DELETE /api/alerts/:id

module.exports = router;
