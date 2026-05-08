// controllers/motorcycleController.js
const { db } = require('../config/firebaseConfig');

const MOTORCYCLE_MODELS = [
  'Honda Click 125i',
  'Honda Click 160',
  'Honda Beat',
  'Honda Wave 110 Alpha',
  'Honda XRM 125',
  'Honda TMX 125 Alpha',
  'Yamaha Mio i 125',
  'Yamaha Mio Gear',
  'Yamaha Mio Soul i 125',
  'Yamaha NMAX',
  'Yamaha Aerox 155',
  'Suzuki Smash 115',
  'Suzuki Raider R150',
  'Suzuki Burgman Street',
  'Kawasaki Barako II',
  'Kawasaki Rouser NS160',
  'Kawasaki Rouser NS200',
  'Rusi Classic 250',
  'Rusi Flash 150',
  'Motorstar Xplorer',
];

exports.listMotorcycleModels = async (req, res) => {
  try {
    const snapshot = await db.collection('motorcycle_models').get();

    if (snapshot.empty) {
      // Seed Firestore with the default list on first call
      const batch = db.batch();
      MOTORCYCLE_MODELS.forEach(name => {
        batch.set(db.collection('motorcycle_models').doc(), {
          name,
          createdAt: new Date().toISOString(),
        });
      });
      await batch.commit();
      const seeded = await db.collection('motorcycle_models').get();
      const list = seeded.docs
        .map(d => ({ id: d.id, name: d.data().name }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return res.json({ models: list.map(m => m.name), modelList: list });
    }

    const list = snapshot.docs
      .map(d => ({ id: d.id, name: d.data().name }))
      .sort((a, b) => a.name.localeCompare(b.name));
    res.json({ models: list.map(m => m.name), modelList: list });
  } catch (error) {
    console.error('Error listing motorcycle models:', error);
    res.json({ models: MOTORCYCLE_MODELS, modelList: [] });
  }
};

exports.addMotorcycleModel = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Model name is required' });
    }
    const ref = await db.collection('motorcycle_models').add({
      name: name.trim(),
      createdAt: new Date().toISOString(),
    });
    res.status(201).json({ model: { id: ref.id, name: name.trim() } });
  } catch (error) {
    console.error('Error adding motorcycle model:', error);
    res.status(500).json({ error: 'Failed to add model' });
  }
};

exports.updateMotorcycleModel = async (req, res) => {
  try {
    const { modelId } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Model name is required' });
    }
    const doc = await db.collection('motorcycle_models').doc(modelId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Model not found' });
    }
    await db.collection('motorcycle_models').doc(modelId).update({
      name: name.trim(),
      updatedAt: new Date().toISOString(),
    });
    res.json({ model: { id: modelId, name: name.trim() } });
  } catch (error) {
    console.error('Error updating motorcycle model:', error);
    res.status(500).json({ error: 'Failed to update model' });
  }
};

exports.deleteMotorcycleModel = async (req, res) => {
  try {
    const { modelId } = req.params;
    const doc = await db.collection('motorcycle_models').doc(modelId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Model not found' });
    }
    await db.collection('motorcycle_models').doc(modelId).delete();
    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    console.error('Error deleting motorcycle model:', error);
    res.status(500).json({ error: 'Failed to delete model' });
  }
};

// Create/Register a new motorcycle
exports.registerMotorcycle = async (req, res) => {
  try {
    const { plateNumber, model, color, deviceCode, department, parkingLocation, ownerName } = req.body;

    if (!plateNumber || !model || !color || !deviceCode) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const motorcycleData = {
      plateNumber: plateNumber.toUpperCase(),
      model,
      color,
      deviceCode,
      department: department || null,
      parkingLocation: parkingLocation || null,
      ownerId: req.user?.uid || null,
      ownerName: ownerName || req.user?.profile?.displayName || req.user?.email || null,
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
    const ownerId = req.query.ownerId || req.user?.uid;
    let query = db.collection('motorcycles');

    if (ownerId) {
      query = query.where('ownerId', '==', ownerId);
      const snapshot = await query.get();
      const motorcycles = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return res.json({ motorcycles });
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

// Update WiFi credentials for a motorcycle device
exports.updateWifiConfig = async (req, res) => {
  try {
    const { id } = req.params;
    const { ssid, password } = req.body;

    if (!ssid || !ssid.trim()) {
      return res.status(400).json({ error: 'SSID is required' });
    }

    const doc = await db.collection('motorcycles').doc(id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: 'Motorcycle not found' });
    }

    const data = doc.data();
    if (data.ownerId !== req.user.uid) {
      return res.status(403).json({ error: 'Not authorized to update this motorcycle' });
    }

    await db.collection('motorcycles').doc(id).update({
      wifiSsid: ssid.trim(),
      wifiPassword: password || '',
      wifiUpdatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.json({ message: 'WiFi configuration updated successfully' });
  } catch (error) {
    console.error('Error updating WiFi config:', error);
    res.status(500).json({ error: 'Failed to update WiFi config' });
  }
};

// Get WiFi config for a device — called by ESP32 on startup/poll
exports.getWifiConfig = async (req, res) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const snapshot = await db.collection('motorcycles')
      .where('deviceCode', '==', deviceId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.json({ ssid: null, password: null });
    }

    const data = snapshot.docs[0].data();
    res.json({
      ssid: data.wifiSsid || null,
      password: data.wifiPassword || null,
      updatedAt: data.wifiUpdatedAt || null,
    });
  } catch (error) {
    console.error('Error getting WiFi config:', error);
    res.status(500).json({ error: 'Failed to get WiFi config' });
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
