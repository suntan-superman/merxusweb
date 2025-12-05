import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import express from 'express';
import cors from 'cors';
import { authenticate } from './middleware/auth';

// Initialize Firebase Admin
admin.initializeApp();

const app = express();

// CORS configuration
app.use(cors({ origin: true }));

// Parse JSON bodies
app.use(express.json());

// Health check endpoint (no auth required)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import onboarding routes (public - no auth required)
import * as onboardingRoutes from './routes/onboarding';

// Apply auth middleware to all routes EXCEPT public ones
app.use((req, res, next) => {
  // Skip auth for health check, public onboarding routes, and Stripe webhook
  const publicPaths = ['/health', '/onboarding/office', '/onboarding/restaurant', '/onboarding/agent', '/onboarding/resend-email', '/billing/webhook'];
  const isPublicPath = publicPaths.includes(req.path);
  
  if (isPublicPath) {
    console.log(`[AUTH] Skipping auth for public path: ${req.path}`);
    return next();
  }
  
  console.log(`[AUTH] Requiring auth for path: ${req.path}`);
  return authenticate(req, res, next);
});

// Public onboarding routes (no auth required - registered AFTER middleware)
app.post('/onboarding/office', onboardingRoutes.createOffice);
app.post('/onboarding/restaurant', onboardingRoutes.createRestaurantPublic);
app.post('/onboarding/agent', onboardingRoutes.createAgent);
app.post('/onboarding/resend-email', onboardingRoutes.resendInvitationEmail);

// Import routes
import * as ordersRoutes from './routes/orders';
import * as reservationsRoutes from './routes/reservations';
import * as callsRoutes from './routes/calls';
import * as customersRoutes from './routes/customers';
import * as menuRoutes from './routes/menu';
import * as settingsRoutes from './routes/settings';
import * as voiceRoutes from './routes/voice';
import * as estateRoutes from './routes/estate';
import * as adminUsersRoutes from './routes/adminUsers';
import * as merxusRoutes from './routes/merxus';
import * as adminRoutes from './routes/admin';
import * as devicesRoutes from './routes/devices';
import * as superAdminRoutes from './routes/superAdmin';
import * as setupRoutes from './routes/setup';
import billingRoutes from './routes/billing';
import * as authRoutes from './routes/auth';
import toastRoutes from './routes/toast';

// Orders routes
app.get('/orders', ordersRoutes.getOrders);
app.patch('/orders/:id', ordersRoutes.updateOrder);

// Reservations routes
app.get('/reservations', reservationsRoutes.getReservations);
app.get('/reservations/:id', reservationsRoutes.getReservation);
app.post('/reservations', reservationsRoutes.createReservation);
app.patch('/reservations/:id', reservationsRoutes.updateReservation);
app.delete('/reservations/:id', reservationsRoutes.deleteReservation);

// Calls routes
app.get('/calls', callsRoutes.getCalls);
app.get('/calls/:id/transcript', callsRoutes.getCallTranscript);
app.post('/calls/:id/translate', callsRoutes.translateCallTranscript);

// Customers routes
app.get('/customers', customersRoutes.getCustomers);
app.get('/customers/:id', customersRoutes.getCustomerDetail);
app.patch('/customers/:id', customersRoutes.updateCustomer);

// Menu routes
app.get('/menu', menuRoutes.getMenu);
app.post('/menu', menuRoutes.createMenuItem);
app.put('/menu/:id', menuRoutes.updateMenuItem);
app.delete('/menu/:id', menuRoutes.deleteMenuItem);
app.patch('/menu/:id', menuRoutes.toggleAvailability);

// Settings routes
app.get('/settings', settingsRoutes.getSettings);
app.patch('/settings', settingsRoutes.updateSettings);

// Toast POS Integration routes (for restaurant tenants)
app.use('/', toastRoutes);

// Voice/Office routes
app.get('/voice/settings', voiceRoutes.getVoiceSettings);
app.patch('/voice/settings', voiceRoutes.updateVoiceSettings);

// Voice Users routes
app.get('/voice/users', voiceRoutes.getVoiceUsers);
app.post('/voice/users/invite', voiceRoutes.inviteVoiceUser);
app.patch('/voice/users/:uid', voiceRoutes.updateVoiceUser);
app.delete('/voice/users/:uid', voiceRoutes.deleteVoiceUser);

// Voice routing rules
app.get('/voice/routing-rules', voiceRoutes.getRoutingRules);
app.post('/voice/routing-rules', voiceRoutes.createRoutingRule);
app.patch('/voice/routing-rules/:ruleId', voiceRoutes.updateRoutingRule);
app.delete('/voice/routing-rules/:ruleId', voiceRoutes.deleteRoutingRule);

// Estate/Real Estate routes
app.get('/estate/settings', estateRoutes.getEstateSettings);
app.patch('/estate/settings', estateRoutes.updateEstateSettings);
app.get('/estate/listings', estateRoutes.getListings);
app.post('/estate/listings', estateRoutes.createListing);
app.patch('/estate/listings/:id', estateRoutes.updateListing);
app.delete('/estate/listings/:id', estateRoutes.deleteListing);
app.get('/estate/leads', estateRoutes.getLeads);
app.patch('/estate/leads/:id', estateRoutes.updateLead);
app.get('/estate/showings', estateRoutes.getShowings);
app.post('/estate/showings', estateRoutes.createShowing);
app.patch('/estate/showings/:id', estateRoutes.updateShowing);
app.delete('/estate/showings/:id', estateRoutes.deleteShowing);
app.get('/estate/calls', estateRoutes.getCalls);
app.post('/estate/listings/:id/send-flyer', (req, res, next) => {
  // map param to body for handler
  req.body = { ...(req.body || {}), listingId: req.params.id };
  return estateRoutes.sendListingFlyer(req as any, res);
});
app.post('/estate/listings/:id/send-flyer-test', (req, res, next) => {
  req.body = { ...(req.body || {}), listingId: req.params.id };
  return estateRoutes.sendListingFlyerTest(req as any, res);
});
app.get('/estate/flyers/queue', estateRoutes.getFlyerQueue);
app.post('/estate/flyers/queue/:id/approve', estateRoutes.approveFlyerQueue);
app.post('/estate/flyers/queue/:id/decline', estateRoutes.declineFlyerQueue);
app.get('/estate/flyers/logs', estateRoutes.getFlyerLogs);
app.get('/estate/flyers/metrics', estateRoutes.getFlyerMetrics);

// Admin Users routes
app.get('/admin/users', adminUsersRoutes.getUsers);
app.post('/admin/users/invite', adminUsersRoutes.inviteUser);
app.patch('/admin/users/:uid', adminUsersRoutes.updateUser);
app.delete('/admin/users/:uid', adminUsersRoutes.deleteUser);

// Merxus Admin routes
app.post('/merxus/restaurants', merxusRoutes.createRestaurant);
app.get('/merxus/restaurants', merxusRoutes.getAllRestaurants);
app.get('/merxus/restaurants/:restaurantId', merxusRoutes.getRestaurant);
app.patch('/merxus/restaurants/:restaurantId', merxusRoutes.updateRestaurant);
app.delete('/merxus/restaurants/:restaurantId', merxusRoutes.deleteRestaurant);
app.post('/merxus/restaurants/:restaurantId/resend-invitation', merxusRoutes.resendInvitation);
app.get('/merxus/restaurants/:restaurantId/menu', merxusRoutes.getRestaurantMenu);
app.post('/merxus/restaurants/:restaurantId/menu', merxusRoutes.createRestaurantMenuItem);
app.put('/merxus/restaurants/:restaurantId/menu/:itemId', merxusRoutes.updateRestaurantMenuItem);
app.delete('/merxus/restaurants/:restaurantId/menu/:itemId', merxusRoutes.deleteRestaurantMenuItem);
app.patch('/merxus/restaurants/:restaurantId/menu/:itemId', merxusRoutes.toggleRestaurantMenuItemAvailability);
app.get('/merxus/analytics', merxusRoutes.getSystemAnalytics);
app.get('/merxus/settings', merxusRoutes.getSystemSettings);
app.patch('/merxus/settings', merxusRoutes.updateSystemSettings);

// Admin routes (for setting up test users - Merxus admin only)
app.post('/admin/test-user', adminRoutes.createTestUser);

// Setup route (ONE-TIME USE - set super admin for sroy@worksidesoftware.com)
app.post('/setup/super-admin', setupRoutes.setupSuperAdmin);

// Super Admin routes (user management - super admin only)
app.get('/super-admin/users', superAdminRoutes.getAllUsers);
app.get('/super-admin/users/:uid', superAdminRoutes.getUser);
app.post('/super-admin/users', superAdminRoutes.createUser);
app.patch('/super-admin/users/:uid', superAdminRoutes.updateUserDetails);
app.delete('/super-admin/users/:uid', superAdminRoutes.deleteUserPermanently);

// Device management routes
app.post('/devices/register', devicesRoutes.registerDevice);
app.post('/devices/deactivate', devicesRoutes.deactivateDevice);
app.get('/devices', devicesRoutes.getDevices);
app.get('/devices/check-limit', devicesRoutes.checkDeviceLimit);

// Billing routes (Stripe integration)
app.use('/billing', billingRoutes);

// Auth utility routes (authenticated)
app.post('/auth/refresh-claims', authRoutes.refreshClaims);
app.get('/auth/claims', authRoutes.getClaims);

// Export the Express app as a Cloud Function
// Use App Engine default service account instead of Compute Engine default
export const api = functions
  .region('us-central1')
  .runWith({
    serviceAccount: 'merxus-f0872@appspot.gserviceaccount.com',
  })
  .https.onRequest(app);

// ---------------------------------------------------------------------
// TOAST POS INTEGRATION - CLOUD FUNCTIONS
// ---------------------------------------------------------------------

import { autoPushOrderToToast, scheduleMenuSync } from './integrations/toast';

/**
 * Firestore Trigger: Auto-push orders to Toast when created
 */
export const onOrderCreated = functions
  .region('us-central1')
  .firestore
  .document('restaurants/{restaurantId}/orders/{orderId}')
  .onCreate(async (snap, context) => {
    const { restaurantId, orderId } = context.params;
    const orderData = snap.data();

    console.log('📦 New order created, checking Toast auto-push:', {
      restaurantId,
      orderId,
      source: orderData.source,
    });

    // Only auto-push orders from AI phone (not manual orders)
    if (orderData.source === 'phone_ai' || orderData.source === 'ai_phone') {
      try {
        await autoPushOrderToToast(restaurantId, orderId);
      } catch (error) {
        console.error('Failed to auto-push order to Toast:', error);
        // Don't throw - let order be created even if Toast push fails
      }
    }
  });

/**
 * Scheduled Function: Sync menus from Toast hourly
 */
export const scheduledToastMenuSync = functions
  .region('us-central1')
  .pubsub
  .schedule('0 * * * *') // Every hour at :00
  .timeZone('America/Los_Angeles')
  .onRun(async () => {
    console.log('⏰ Running scheduled Toast menu sync...');
    
    try {
      await scheduleMenuSync();
      console.log('✅ Scheduled menu sync completed');
    } catch (error) {
      console.error('❌ Scheduled menu sync failed:', error);
      throw error; // Re-throw so Cloud Scheduler marks as failed
    }
  });

