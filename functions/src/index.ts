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

// Apply auth middleware to all routes except health
app.use((req, res, next) => {
  if (req.path === '/health') {
    return next();
  }
  return authenticate(req, res, next);
});

// Import routes
import * as ordersRoutes from './routes/orders';
import * as callsRoutes from './routes/calls';
import * as customersRoutes from './routes/customers';
import * as menuRoutes from './routes/menu';
import * as settingsRoutes from './routes/settings';
import * as adminUsersRoutes from './routes/adminUsers';
import * as merxusRoutes from './routes/merxus';
import * as adminRoutes from './routes/admin';

// Orders routes
app.get('/orders', ordersRoutes.getOrders);
app.patch('/orders/:id', ordersRoutes.updateOrder);

// Calls routes
app.get('/calls', callsRoutes.getCalls);
app.get('/calls/:id/transcript', callsRoutes.getCallTranscript);

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

// Export the Express app as a Cloud Function
// Use App Engine default service account instead of Compute Engine default
export const api = functions
  .region('us-central1')
  .runWith({
    serviceAccount: 'merxus-f0872@appspot.gserviceaccount.com',
  })
  .https.onRequest(app);

