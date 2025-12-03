import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/auth';

const db = admin.firestore();

/**
 * Register a device for call forwarding
 * Checks if device limit is reached before allowing registration
 */
export async function registerDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { deviceId, deviceName, phoneNumber } = req.body;
    const user = req.user!;
    
    if (!deviceId) {
      res.status(400).json({ error: 'Device ID is required' });
      return;
    }

    // Get tenant info from user claims
    const tenantId = user.restaurantId || user.officeId || user.agentId;
    const tenantType = user.type; // 'restaurant' | 'voice' | 'real_estate'

    if (!tenantId || !tenantType) {
      res.status(400).json({ error: 'User is not associated with a tenant' });
      return;
    }

    // Determine collection name
    let collectionName: string;
    switch (tenantType) {
      case 'restaurant':
        collectionName = 'restaurants';
        break;
      case 'voice':
        collectionName = 'offices';
        break;
      case 'real_estate':
        collectionName = 'agents';
        break;
      default:
        res.status(400).json({ error: 'Invalid tenant type' });
        return;
    }

    const tenantRef = db.collection(collectionName).doc(tenantId);
    const settingsRef = tenantRef.collection('meta').doc('settings');
    const devicesRef = tenantRef.collection('devices');

    // Get current settings to check device limit
    const settingsDoc = await settingsRef.get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    
    // Default device limit (can be overridden in settings)
    const maxDevices = (settings as any)?.maxActiveDevices || 3; // Default to 3 devices

    // Count currently active devices
    const activeDevicesSnapshot = await devicesRef
      .where('isActive', '==', true)
      .get();
    
    const activeDeviceCount = activeDevicesSnapshot.size;

    // Check if device already exists
    const existingDeviceDoc = await devicesRef.doc(deviceId).get();
    const isReactivation = existingDeviceDoc.exists && !(existingDeviceDoc.data() as any)?.isActive;

    // If limit reached and not reactivating existing device, reject
    if (activeDeviceCount >= maxDevices && !isReactivation) {
      res.status(403).json({ 
        error: 'Device limit reached',
        message: `Maximum ${maxDevices} active device(s) allowed per account. Please deactivate another device first.`,
        maxDevices,
        currentActiveDevices: activeDeviceCount
      });
      return;
    }

    // Register or update device
    const deviceData = {
      deviceId,
      userId: user.uid,
      userEmail: user.email,
      deviceName: deviceName || 'Unknown Device',
      phoneNumber: phoneNumber || null,
      isActive: true,
      registeredAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
      activatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await devicesRef.doc(deviceId).set(deviceData, { merge: true });

    res.json({
      success: true,
      device: deviceData,
      activeDeviceCount: isReactivation ? activeDeviceCount : activeDeviceCount + 1,
      maxDevices
    });
  } catch (error: any) {
    console.error('Error registering device:', error);
    res.status(500).json({ error: 'Failed to register device', message: error.message });
  }
}

/**
 * Deactivate a device (unregister from call forwarding)
 */
export async function deactivateDevice(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { deviceId } = req.body;
    const user = req.user!;

    if (!deviceId) {
      res.status(400).json({ error: 'Device ID is required' });
      return;
    }

    // Get tenant info
    const tenantId = user.restaurantId || user.officeId || user.agentId;
    const tenantType = user.type;

    if (!tenantId || !tenantType) {
      res.status(400).json({ error: 'User is not associated with a tenant' });
      return;
    }

    let collectionName: string;
    switch (tenantType) {
      case 'restaurant':
        collectionName = 'restaurants';
        break;
      case 'voice':
        collectionName = 'offices';
        break;
      case 'real_estate':
        collectionName = 'agents';
        break;
      default:
        res.status(400).json({ error: 'Invalid tenant type' });
        return;
    }

    const devicesRef = db.collection(collectionName).doc(tenantId).collection('devices');
    const deviceDoc = await devicesRef.doc(deviceId).get();

    if (!deviceDoc.exists) {
      res.status(404).json({ error: 'Device not found' });
      return;
    }

    const deviceData = deviceDoc.data();
    
    // Verify device belongs to user (or user is owner/admin)
    if (deviceData?.userId !== user.uid && user.role !== 'owner' && user.role !== 'merxus_admin') {
      res.status(403).json({ error: 'Not authorized to deactivate this device' });
      return;
    }

    // Deactivate device
    await devicesRef.doc(deviceId).update({
      isActive: false,
      deactivatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastActiveAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Get updated count
    const activeDevicesSnapshot = await devicesRef
      .where('isActive', '==', true)
      .get();

    res.json({
      success: true,
      message: 'Device deactivated successfully',
      activeDeviceCount: activeDevicesSnapshot.size
    });
  } catch (error: any) {
    console.error('Error deactivating device:', error);
    res.status(500).json({ error: 'Failed to deactivate device', message: error.message });
  }
}

/**
 * Get all devices for the tenant (admin/owner only)
 */
export async function getDevices(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user!;

    // Get tenant info
    const tenantId = user.restaurantId || user.officeId || user.agentId;
    const tenantType = user.type;

    if (!tenantId || !tenantType) {
      res.status(400).json({ error: 'User is not associated with a tenant' });
      return;
    }

    // Only owners and admins can view all devices
    if (user.role !== 'owner' && user.role !== 'manager' && user.role !== 'merxus_admin') {
      res.status(403).json({ error: 'Not authorized to view devices' });
      return;
    }

    let collectionName: string;
    switch (tenantType) {
      case 'restaurant':
        collectionName = 'restaurants';
        break;
      case 'voice':
        collectionName = 'offices';
        break;
      case 'real_estate':
        collectionName = 'agents';
        break;
      default:
        res.status(400).json({ error: 'Invalid tenant type' });
        return;
    }

    const devicesRef = db.collection(collectionName).doc(tenantId).collection('devices');
    const devicesSnapshot = await devicesRef.orderBy('lastActiveAt', 'desc').get();

    const devices = devicesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get device limit from settings
    const settingsRef = db.collection(collectionName).doc(tenantId).collection('meta').doc('settings');
    const settingsDoc = await settingsRef.get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    const maxDevices = (settings as any)?.maxActiveDevices || 3;

    const activeDevices = devices.filter((d: any) => d.isActive);
    const inactiveDevices = devices.filter((d: any) => !d.isActive);

    res.json({
      devices: {
        active: activeDevices,
        inactive: inactiveDevices,
        all: devices
      },
      stats: {
        total: devices.length,
        active: activeDevices.length,
        inactive: inactiveDevices.length,
        maxDevices
      }
    });
  } catch (error: any) {
    console.error('Error getting devices:', error);
    res.status(500).json({ error: 'Failed to get devices', message: error.message });
  }
}

/**
 * Check if device can be registered (check limit without registering)
 */
export async function checkDeviceLimit(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = req.user!;

    // Get tenant info
    const tenantId = user.restaurantId || user.officeId || user.agentId;
    const tenantType = user.type;

    if (!tenantId || !tenantType) {
      res.status(400).json({ error: 'User is not associated with a tenant' });
      return;
    }

    let collectionName: string;
    switch (tenantType) {
      case 'restaurant':
        collectionName = 'restaurants';
        break;
      case 'voice':
        collectionName = 'offices';
        break;
      case 'real_estate':
        collectionName = 'agents';
        break;
      default:
        res.status(400).json({ error: 'Invalid tenant type' });
        return;
    }

    const tenantRef = db.collection(collectionName).doc(tenantId);
    const settingsRef = tenantRef.collection('meta').doc('settings');
    const devicesRef = tenantRef.collection('devices');

    // Get settings
    const settingsDoc = await settingsRef.get();
    const settings = settingsDoc.exists ? settingsDoc.data() : {};
    const maxDevices = (settings as any)?.maxActiveDevices || 3;

    // Count active devices
    const activeDevicesSnapshot = await devicesRef
      .where('isActive', '==', true)
      .get();
    
    const activeDeviceCount = activeDevicesSnapshot.size;
    const canRegister = activeDeviceCount < maxDevices;

    res.json({
      canRegister,
      maxDevices,
      currentActiveDevices: activeDeviceCount,
      remainingSlots: Math.max(0, maxDevices - activeDeviceCount)
    });
  } catch (error: any) {
    console.error('Error checking device limit:', error);
    res.status(500).json({ error: 'Failed to check device limit', message: error.message });
  }
}
