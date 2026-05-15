// routes/motorcycleRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/motorcycleController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');
const { motorcyclePhoto } = require('../middleware/upload');

// Public routes
router.get('/models', controller.listMotorcycleModels); // GET /api/motorcycles/models
router.get('/search', controller.searchByPlate);  // GET /api/motorcycles/search?plateNumber=ABC
router.get('/wifi/config', controller.getWifiConfig); // GET /api/motorcycles/wifi/config?deviceId=X (ESP32)

// Admin-only model management (must be before /:id routes)
router.post('/models', authenticate, requireAdmin, controller.addMotorcycleModel);         // POST /api/motorcycles/models
router.put('/models/:modelId', authenticate, requireAdmin, controller.updateMotorcycleModel); // PUT /api/motorcycles/models/:modelId
router.delete('/models/:modelId', authenticate, requireAdmin, controller.deleteMotorcycleModel); // DELETE /api/motorcycles/models/:modelId

// Protected routes
router.post('/', authenticate, controller.registerMotorcycle);           // POST /api/motorcycles
router.get('/', authenticate, controller.listMotorcycles);               // GET /api/motorcycles
router.get('/:id', authenticate, controller.getMotorcycle);              // GET /api/motorcycles/:id
router.put('/:id', authenticate, controller.updateMotorcycle);           // PUT /api/motorcycles/:id
router.delete('/:id', authenticate, controller.deleteMotorcycle);        // DELETE /api/motorcycles/:id
router.put('/:id/activate', authenticate, controller.toggleActivation);  // PUT /api/motorcycles/:id/activate
router.put('/:id/location', authenticate, controller.updateLocation);    // PUT /api/motorcycles/:id/location
router.post('/:id/photo', authenticate, (req, res, next) => {
  motorcyclePhoto.single('photo')(req, res, (err) => {
    if (err) return res.status(500).json({ error: err.message || 'Upload failed' });
    next();
  });
}, controller.uploadPhoto); // POST /api/motorcycles/:id/photo
router.put('/:id/wifi', authenticate, controller.updateWifiConfig); // PUT /api/motorcycles/:id/wifi
router.put('/:id/note', authenticate, controller.updateParkingNote); // PUT /api/motorcycles/:id/note

module.exports = router;
