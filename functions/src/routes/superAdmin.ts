import { Response } from 'express';
import * as admin from 'firebase-admin';
import { AuthenticatedRequest } from '../middleware/auth';

const db = admin.firestore();

// Helper to check if user is super admin
function requireSuperAdmin(req: AuthenticatedRequest, res: Response): boolean {
  const userRole = req.user?.role;
  if (userRole !== 'super_admin') {
    res.status(403).json({ error: 'Super admin access required' });
    return false;
  }
  return true;
}

// Get all users across all tenants
export async function getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireSuperAdmin(req, res)) return;

    const includeDisabled = req.query.includeDisabled === 'true';
    
    // Get all users from Firebase Auth
    let allUsers: admin.auth.UserRecord[] = [];
    let pageToken: string | undefined;
    
    do {
      const listUsersResult = await admin.auth().listUsers(1000, pageToken);
      allUsers = allUsers.concat(listUsersResult.users);
      pageToken = listUsersResult.pageToken;
    } while (pageToken);

    // Filter out disabled users if needed
    if (!includeDisabled) {
      allUsers = allUsers.filter(user => !user.disabled);
    }

    // Format user data with custom claims
    const users = allUsers.map(user => {
      const claims = (user.customClaims || {}) as any;
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || '',
        disabled: user.disabled,
        emailVerified: user.emailVerified,
        createdAt: user.metadata.creationTime,
        lastSignIn: user.metadata.lastSignInTime,
        // Custom claims
        role: claims.role || '',
        tenantType: claims.type || '',
        restaurantId: claims.restaurantId || '',
        officeId: claims.officeId || '',
        agentId: claims.agentId || '',
        tenantId: claims.tenantId || '',
        // Phone
        phoneNumber: user.phoneNumber || '',
      };
    });

    // Sort by creation date (newest first)
    users.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    res.json(users);
  } catch (err: any) {
    console.error('Error fetching all users:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
}

// Get single user details
export async function getUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireSuperAdmin(req, res)) return;

    const { uid } = req.params;
    
    const userRecord = await admin.auth().getUser(uid);
    const claims = (userRecord.customClaims || {}) as any;

    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || '',
      disabled: userRecord.disabled,
      emailVerified: userRecord.emailVerified,
      createdAt: userRecord.metadata.creationTime,
      lastSignIn: userRecord.metadata.lastSignInTime,
      phoneNumber: userRecord.phoneNumber || '',
      role: claims.role || '',
      tenantType: claims.type || '',
      restaurantId: claims.restaurantId || '',
      officeId: claims.officeId || '',
      agentId: claims.agentId || '',
      tenantId: claims.tenantId || '',
    });
  } catch (err: any) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
}

// Create new user with password (super admin only)
export async function createUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireSuperAdmin(req, res)) return;

    const {
      email,
      password,
      displayName,
      phoneNumber,
      tenantType, // 'restaurant', 'voice', 'real_estate'
      role, // 'owner', 'manager', 'staff', 'agent', etc.
      // Tenant IDs
      restaurantId,
      officeId,
      agentId,
      // Twilio config
      twilioNumber,
      twilioSid,
      // Additional info
      companyName,
      brokerage,
    } = req.body;

    // Validate required fields
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required' });
      return;
    }

    if (!tenantType || !['restaurant', 'voice', 'real_estate'].includes(tenantType)) {
      res.status(400).json({ error: 'Valid tenant type is required (restaurant, voice, real_estate)' });
      return;
    }

    // Determine tenant ID based on type
    let tenantId: string;
    if (tenantType === 'restaurant') {
      if (!restaurantId) {
        // Generate new restaurant ID
        tenantId = `rest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      } else {
        tenantId = restaurantId;
      }
    } else if (tenantType === 'voice') {
      if (!officeId) {
        // Generate new office ID
        tenantId = `office_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      } else {
        tenantId = officeId;
      }
    } else { // real_estate
      if (!agentId) {
        // Generate new agent ID
        tenantId = `agent_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      } else {
        tenantId = agentId;
      }
    }

    // Create Firebase Auth user
    // NOTE: phoneNumber is NOT passed here because it's for phone auth (SMS login)
    // We store it in Firestore settings as contact info instead
    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
      emailVerified: false,
      disabled: false,
    });

    // Set custom claims based on tenant type
    const claims: any = {
      role: role || 'owner',
      type: tenantType,
    };

    if (tenantType === 'restaurant') {
      claims.restaurantId = tenantId;
    } else if (tenantType === 'voice') {
      claims.officeId = tenantId;
    } else { // real_estate
      claims.agentId = tenantId;
      claims.tenantId = tenantId; // Real estate also uses tenantId
    }

    await admin.auth().setCustomUserClaims(userRecord.uid, claims);

    // Create or update tenant document based on type
    if (tenantType === 'restaurant') {
      const restaurantRef = db.collection('restaurants').doc(tenantId);
      
      // Check if restaurant exists
      const restaurantDoc = await restaurantRef.get();
      if (!restaurantDoc.exists) {
        // Create new restaurant
        await restaurantRef.set({
          email: email,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          disabled: false,
        });

        // Create settings
        await restaurantRef.collection('meta').doc('settings').set({
          restaurantId: tenantId,
          name: companyName || 'New Restaurant',
          email: email,
          phoneNumber: twilioNumber || '',
          twilioNumberSid: twilioSid || '',
          timezone: 'America/Los_Angeles',
          businessHours: {
            monday: { open: '11:00', close: '21:00', closed: false },
            tuesday: { open: '11:00', close: '21:00', closed: false },
            wednesday: { open: '11:00', close: '21:00', closed: false },
            thursday: { open: '11:00', close: '21:00', closed: false },
            friday: { open: '11:00', close: '21:00', closed: false },
            saturday: { open: '11:00', close: '21:00', closed: false },
            sunday: { open: '11:00', close: '21:00', closed: false },
          },
          notifySmsNumbers: [],
          notifyEmailAddresses: [email],
          aiConfig: {
            model: 'gpt-4o-mini',
            voiceName: 'alloy',
            language: 'en-US',
          },
        });
      }

      // Create user document
      await restaurantRef.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: displayName || email.split('@')[0],
        role: role || 'owner',
        invitedAt: admin.firestore.FieldValue.serverTimestamp(),
        disabled: false,
      });

    } else if (tenantType === 'voice') {
      console.log(`🔵 SUPER ADMIN: Creating VOICE user in collection='offices', doc='${tenantId}'`);
      const officeRef = db.collection('offices').doc(tenantId);
      
      // Check if office exists
      const officeDoc = await officeRef.get();
      if (!officeDoc.exists) {
        // Create new office
        console.log(`🔵 Creating new office document in offices/${tenantId}`);
        await officeRef.set({
          email: email,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          disabled: false,
        });
      }

      // Always create/update settings (use merge to preserve existing data)
      console.log(`🔵 Creating settings in offices/${tenantId}/meta/settings`);
      await officeRef.collection('meta').doc('settings').set({
        officeId: tenantId,
        name: companyName || 'New Office',
        email: email,
        phoneNumber: phoneNumber || '', // Contact phone (personal phone)
        twilioPhoneNumber: twilioNumber || '', // Twilio number
        twilioNumberSid: twilioSid || '',
        address: '',
        websiteUrl: '',
        timezone: 'America/Los_Angeles',
        businessType: {
          category: '',
          industry: '',
        },
        businessHours: {
          monday: { open: '09:00', close: '17:00', closed: false },
          tuesday: { open: '09:00', close: '17:00', closed: false },
          wednesday: { open: '09:00', close: '17:00', closed: false },
          thursday: { open: '09:00', close: '17:00', closed: false },
          friday: { open: '09:00', close: '17:00', closed: false },
          saturday: { open: '09:00', close: '17:00', closed: true },
          sunday: { open: '09:00', close: '17:00', closed: true },
        },
        services: [],
        products: [],
        notifySmsNumbers: [],
        notifyEmailAddresses: [email],
        aiConfig: {
          model: 'gpt-4o-mini',
          voiceName: 'alloy',
          language: 'en-US',
          systemPrompt: '',
        },
      }, { merge: true });

      // Create user document
      await officeRef.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: displayName || email.split('@')[0],
        role: role || 'owner',
        invitedAt: admin.firestore.FieldValue.serverTimestamp(),
        disabled: false,
      });

    } else { // real_estate
      const agentRef = db.collection('agents').doc(tenantId);
      
      // Check if agent exists
      const agentDoc = await agentRef.get();
      if (!agentDoc.exists) {
        // Create new agent
        await agentRef.set({
          email: email,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          disabled: false,
        });
      }

      // Always create/update settings (use merge to preserve existing data)
      await agentRef.collection('meta').doc('settings').set({
        agentId: tenantId,
        name: displayName || email.split('@')[0],
        brandName: companyName || '',
        email: email,
        phonePrimary: phoneNumber || twilioNumber || '',
        twilioPhoneNumber: twilioNumber || '',
        twilioNumberSid: twilioSid || '',
        address: '',
        websiteUrl: '',
        brokerage: brokerage || '',
        licenseNumber: '',
        markets: [],
        languagesSupported: ['en', 'es'],
        timezone: 'America/Los_Angeles',
        businessHours: {
          monday: { open: '09:00', close: '18:00', closed: false },
          tuesday: { open: '09:00', close: '18:00', closed: false },
          wednesday: { open: '09:00', close: '18:00', closed: false },
          thursday: { open: '09:00', close: '18:00', closed: false },
          friday: { open: '09:00', close: '18:00', closed: false },
          saturday: { open: '10:00', close: '16:00', closed: false },
          sunday: { open: null, close: null, closed: true },
        },
        yearsExperience: null,
        homesSold: null,
        specializations: [],
        awards: [],
        certifications: [],
        notifySmsNumbers: [],
        notifyEmailAddresses: [email],
        aiConfig: {
          model: 'gpt-4o-mini',
          voiceName: 'alloy',
          language: 'en-US',
          systemPrompt: '',
        },
      }, { merge: true });

      // Create user document
      await agentRef.collection('users').doc(userRecord.uid).set({
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: displayName || email.split('@')[0],
        role: role || 'agent',
        invitedAt: admin.firestore.FieldValue.serverTimestamp(),
        disabled: false,
      });
    }

    console.log(`✅ Super admin created user: ${email} (${tenantType})`);

    res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName,
      tenantType,
      tenantId,
      role: claims.role,
      message: 'User created successfully',
    });
  } catch (err: any) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: err.message || 'Failed to create user' });
  }
}

// Update user
export async function updateUserDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireSuperAdmin(req, res)) return;

    const { uid } = req.params;
    const {
      displayName,
      disabled,
      role,
      password,
    } = req.body;

    // NOTE: phoneNumber is intentionally NOT extracted/updated here because 
    // Firebase Auth phoneNumber is for phone auth (SMS login), not contact info
    // Phone number is stored in Firestore settings as contact info instead
    
    // Update Firebase Auth user
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (disabled !== undefined) updateData.disabled = disabled;
    if (password) updateData.password = password;

    await admin.auth().updateUser(uid, updateData);

    // Update custom claims if role changed
    if (role) {
      const userRecord = await admin.auth().getUser(uid);
      const currentClaims = (userRecord.customClaims || {}) as any;
      await admin.auth().setCustomUserClaims(uid, {
        ...currentClaims,
        role,
      });
    }

    // Get updated user
    const userRecord = await admin.auth().getUser(uid);
    const claims = (userRecord.customClaims || {}) as any;

    res.json({
      uid: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || '',
      disabled: userRecord.disabled,
      phoneNumber: userRecord.phoneNumber || '',
      role: claims.role || '',
      message: 'User updated successfully',
    });
  } catch (err: any) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: 'Failed to update user' });
  }
}

// Delete user (hard delete)
export async function deleteUserPermanently(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!requireSuperAdmin(req, res)) return;

    const { uid } = req.params;
    
    // Get user info before deleting
    const userRecord = await admin.auth().getUser(uid);
    const claims = (userRecord.customClaims || {}) as any;

    // Delete from Firebase Auth
    await admin.auth().deleteUser(uid);

    // Delete from Firestore (user documents in tenant collections)
    if (claims.restaurantId) {
      await db.collection('restaurants').doc(claims.restaurantId).collection('users').doc(uid).delete();
    }
    if (claims.officeId) {
      await db.collection('offices').doc(claims.officeId).collection('users').doc(uid).delete();
    }
    if (claims.agentId) {
      await db.collection('agents').doc(claims.agentId).collection('users').doc(uid).delete();
    }

    console.log(`🗑️ Super admin deleted user: ${userRecord.email}`);

    res.json({ success: true, message: 'User deleted permanently' });
  } catch (err: any) {
    console.error('Error deleting user:', err);
    res.status(500).json({ error: 'Failed to delete user' });
  }
}
