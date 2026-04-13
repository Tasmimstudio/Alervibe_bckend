// routes/motorcycleRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/motorcycleController');
const { authenticate } = require('../middleware/authMiddleware');
const { motorcyclePhoto } = require('../middleware/upload');

// Public routes
router.get('/search', controller.searchByPlate);  // GET /api/motorcycles/search?plateNumber=ABC

// Protected routes
router.post('/', authenticate, controller.registerMotorcycle);           // POST /api/motorcycles
router.get('/', authenticate, controller.listMotorcycles);               // GET /api/motorcycles
router.get('/:id', authenticate, controller.getMotorcycle);              // GET /api/motorcycles/:id
router.put('/:id', authenticate, controller.updateMotorcycle);           // PUT /api/motorcycles/:id
router.delete('/:id', authenticate, controller.deleteMotorcycle);        // DELETE /api/motorcycles/:id
router.put('/:id/activate', authenticate, controller.toggleActivation);  // PUT /api/motorcycles/:id/activate
router.put('/:id/location', authenticate, controller.updateLocation);    // PUT /api/motorcycles/:id/location
router.post('/:id/photo', authenticate, motorcyclePhoto.single('photo'), controller.uploadPhoto); // POST /api/motorcycles/:id/photo

module.exports = router;
