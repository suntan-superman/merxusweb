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
  // Skip auth for health check and public onboarding routes
  const publicPaths = ['/health', '/onboarding/office', '/onboarding/restaurant', '/onboarding/agent', '/onboarding/resend-email'];
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

// Voice/Office routes
app.get('/voice/settings', voiceRoutes.getVoiceSettings);
app.patch('/voice/settings', voiceRoutes.updateVoiceSettings);

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

// Device management routes
app.post('/devices/register', devicesRoutes.registerDevice);
app.post('/devices/deactivate', devicesRoutes.deactivateDevice);
app.get('/devices', devicesRoutes.getDevices);
app.get('/devices/check-limit', devicesRoutes.checkDeviceLimit);

// Export the Express app as a Cloud Function
// Use App Engine default service account instead of Compute Engine default
export const api = functions
  .region('us-central1')
  .runWith({
    serviceAccount: 'merxus-f0872@appspot.gserviceaccount.com',
  })
  .https.onRequest(app);

