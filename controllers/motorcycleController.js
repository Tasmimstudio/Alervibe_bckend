// controllers/motorcycleController.js
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

// Create/Register a new motorcycle
exports.registerMotorcycle = async (req, res) => {
  try {
    const { plateNumber, model, color, deviceCode, department, ownerId, ownerName } = req.body;

    if (!plateNumber || !model || !color || !deviceCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const motorcycleData = {
      plateNumber: plateNumber.toUpperCase(),
      model,
      color,
      deviceCode,
      department: department || null,
      ownerId: ownerId || req.user?.uid || null,
      ownerName: ownerName || req.user?.displayName || null,
      photoURL: req.body.photoURL || null,
      status: 'active',
      isActivated: true,
      location: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const motorcycleRef = await db.collection('motorcycles').add(motorcycleData);
    const motorcycle = { id: motorcycleRef.id, ...motorcycleData };

    res.status(201).json({ motorcycle });
  } catch (error) {
    console.error('Error registering motorcycle:', error);
    res.status(500).json({ error: 'Failed to register motorcycle' });
  }
};

// Get all motorcycles
exports.listMotorcycles = async (req, res) => {
  try {
    const { ownerId } = req.query;
    let query = db.collection('motorcycles');

    if (ownerId) {
      query = query.where('ownerId', '==', ownerId);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const motorcycles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ motorcycles });
  } catch (error) {
    console.error('Error listing motorcycles:', error);
    res.status(500).json({ error: 'Failed to list motorcycles' });
  }
};

// Get a single motorcycle by ID
exports.getMotorcycle = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection('motorcycles').doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Motorcycle not found' });
    }

    res.json({ motorcycle: { id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Error getting motorcycle:', error);
    res.status(500).json({ error: 'Failed to get motorcycle' });
  }
};

// Update motorcycle
exports.updateMotorcycle = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const doc = await db.collection('motorcycles').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Motorcycle not found' });
    }

    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await db.collection('motorcycles').doc(id).update(updatedData);
    const updated = await db.collection('motorcycles').doc(id).get();

    res.json({ motorcycle: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error('Error updating motorcycle:', error);
    res.status(500).json({ error: 'Failed to update motorcycle' });
  }
};

// Delete motorcycle
exports.deleteMotorcycle = async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await db.collection('motorcycles').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Motorcycle not found' });
    }

    await db.collection('motorcycles').doc(id).delete();
    res.json({ message: 'Motorcycle deleted successfully' });
  } catch (error) {
    console.error('Error deleting motorcycle:', error);
    res.status(500).json({ error: 'Failed to delete motorcycle' });
  }
};

// Toggle motorcycle activation status
exports.toggleActivation = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActivated } = req.body;

    const doc = await db.collection('motorcycles').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Motorcycle not found' });
    }

    await db.collection('motorcycles').doc(id).update({
      isActivated,
      updatedAt: new Date().toISOString(),
    });

    const updated = await db.collection('motorcycles').doc(id).get();
    res.json({ motorcycle: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error('Error toggling activation:', error);
    res.status(500).json({ error: 'Failed to toggle activation' });
  }
};

// Update motorcycle location/status
exports.updateLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { location } = req.body;

    const doc = await db.collection('motorcycles').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Motorcycle not found' });
    }

    await db.collection('motorcycles').doc(id).update({
      location,
      updatedAt: new Date().toISOString(),
    });

    const updated = await db.collection('motorcycles').doc(id).get();
    res.json({ motorcycle: { id: updated.id, ...updated.data() } });
  } catch (error) {
    console.error('Error updating location:', error);
    res.status(500).json({ error: 'Failed to update location' });
  }
};

// Upload motorcycle photo
exports.uploadPhoto = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }

    const doc = await db.collection('motorcycles').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Motorcycle not found' });
    }

    const photoURL = req.file.path; // Cloudinary URL

    await db.collection('motorcycles').doc(id).update({
      photoURL,
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: 'Motorcycle photo uploaded successfully', photoURL });
  } catch (error) {
    console.error('Error uploading motorcycle photo:', error);
    res.status(500).json({ error: 'Failed to upload motorcycle photo' });
  }
};

// Search motorcycles by plate number
exports.searchByPlate = async (req, res) => {
  try {
    const { plateNumber } = req.query;

    if (!plateNumber) {
      return res.status(400).json({ error: 'Plate number is required' });
    }

    const snapshot = await db.collection('motorcycles')
      .where('plateNumber', '>=', plateNumber.toUpperCase())
      .where('plateNumber', '<=', plateNumber.toUpperCase() + '\uf8ff')
      .get();

    const motorcycles = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.json({ motorcycles });
  } catch (error) {
    console.error('Error searching motorcycles:', error);
    res.status(500).json({ error: 'Failed to search motorcycles' });
  }
};
