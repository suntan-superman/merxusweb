# 🍞 Toast POS Integration - Implementation Summary

**Status:** Phase 1 Complete - Foundation Built  
**Date:** December 5, 2025

---

## ✅ What's Been Implemented

### **Backend (Firebase Functions)**

#### 1. Toast API Client (`functions/src/integrations/toast/toastClient.ts`)
- ✅ Axios-based client with authentication
- ✅ Automatic token refresh when expired
- ✅ Request/response interceptors for error handling
- ✅ Methods for all Toast API endpoints:
  - `fetchMenu()` - Get menu from Toast
  - `fetchMenuItems()` - Get menu items
  - `createOrder()` - Push order to Toast
  - `getInventory()` - Get 86'd items
  - `getRestaurantDetails()` - Get restaurant info

#### 2. OAuth Authentication (`functions/src/integrations/toast/toastOAuth.ts`)
- ✅ `authenticateToast()` - Connect Toast account
- ✅ `disconnectToast()` - Disconnect Toast account
- ✅ `isToastConnected()` - Check connection status
- ✅ Stores credentials securely in Firestore (`restaurants/{id}/integrations/toast`)

#### 3. Menu Sync (`functions/src/integrations/toast/menuSync.ts`)
- ✅ `syncMenuFromToast()` - Pull menu items from Toast → Merxus
- ✅ `scheduleMenuSync()` - Scheduled sync (for Cloud Scheduler)
- ✅ Transforms Toast items to Merxus format
- ✅ Tracks added/updated/removed items
- ✅ Handles incremental sync (doesn't duplicate items)

#### 4. Order Push (`functions/src/integrations/toast/orderPush.ts`)
- ✅ `pushOrderToToast()` - Push orders from Merxus → Toast
- ✅ `autoPushOrderToToast()` - Auto-push on order creation
- ✅ Transforms Merxus orders to Toast format
- ✅ Maps menu items using Toast GUIDs
- ✅ Updates order status in Firestore

#### 5. API Routes (`functions/src/routes/toast.ts`)
- ✅ `POST /toast/connect` - Connect Toast
- ✅ `POST /toast/disconnect` - Disconnect Toast
- ✅ `GET /toast/status` - Check connection status
- ✅ `POST /toast/sync-menu` - Manual menu sync
- ✅ `POST /toast/push-order/:orderId` - Manual order push

---

### **Frontend (Web App)**

#### 1. API Client (`src/api/toast.js`)
- ✅ `connectToast()`
- ✅ `disconnectToast()`
- ✅ `getToastStatus()`
- ✅ `syncMenuFromToast()`
- ✅ `pushOrderToToast()`

#### 2. Toast Settings UI (`src/components/settings/TOASTPOSSettings.jsx`)
- ✅ Connection status display
- ✅ Connect/disconnect buttons
- ✅ Manual menu sync button
- ✅ Toast credentials form (Client ID, Secret, Restaurant GUID)
- ✅ Help text with links to Toast Developer Portal
- ✅ Success/error notifications

#### 3. Settings Page Integration
- ✅ Added Toast POS section to Restaurant Settings
- ✅ Replaced generic POS Integration component

---

## ❌ What's NOT Implemented Yet

### **1. Toast Partner Program Application**
- [ ] Need to apply for Toast Developer Partner Program
- [ ] Need to get approved for API access
- [ ] Need to obtain sandbox credentials for testing
- **Estimated Time:** 1-2 weeks (waiting for Toast approval)

### **2. Environment Variables**
- [ ] Add `TOAST_CLIENT_ID` to Firebase Functions config
- [ ] Add `TOAST_CLIENT_SECRET` to Firebase Functions config
- [ ] Add `TOAST_ENV` (sandbox vs production)

### **3. Scheduled Menu Sync**
- [ ] Set up Cloud Scheduler job to run `scheduleMenuSync()` hourly
- [ ] Configure cron expression: `0 * * * *` (every hour)

### **4. Auto-Push on Order Creation**
- [ ] Add Firestore trigger to auto-push orders to Toast
- [ ] Create Cloud Function: `onOrderCreated`
- [ ] Call `autoPushOrderToToast()` when new order is created

### **5. Inventory Sync (86'd Items)**
- [ ] Implement periodic inventory check
- [ ] Update menu items with Toast availability status
- [ ] Prevent AI from offering out-of-stock items

### **6. Webhooks from Toast**
- [ ] Register webhook URL with Toast
- [ ] Handle `Order.Modified` (order status changes)
- [ ] Handle `Menu.Published` (menu updates)
- [ ] Handle `Inventory.Updated` (item availability)

### **7. Testing**
- [ ] Unit tests for API client
- [ ] Integration tests with Toast sandbox
- [ ] End-to-end test: AI call → order → Toast POS
- [ ] Error handling tests (token expired, API down, etc.)

### **8. Security Enhancements**
- [ ] Encrypt `clientSecret` before storing in Firestore
- [ ] Use Google Secret Manager for credentials
- [ ] Add rate limiting to prevent abuse
- [ ] Validate Toast webhook signatures

---

## 🚀 Next Steps (In Order)

### **Step 1: Apply for Toast Partner Program (BLOCKING)**
**Time:** 1-2 weeks (waiting for approval)

1. Go to https://partners.toasttab.com/
2. Apply for Developer Partner Program
3. Wait for approval email
4. Get sandbox credentials (Client ID, Secret, Restaurant GUID)

**While waiting, proceed to Step 2-4:**

---

### **Step 2: Deploy Backend (10 minutes)**

```bash
cd web/functions
npm install
npm run build
firebase deploy --only functions
```

**Set environment variables:**
```bash
firebase functions:config:set toast.client_id="YOUR_CLIENT_ID"
firebase functions:config:set toast.client_secret="YOUR_CLIENT_SECRET"
firebase functions:config:set toast.env="sandbox"
```

---

### **Step 3: Deploy Frontend (5 minutes)**

```bash
cd web
npm run build
# Push to GitHub (triggers Netlify auto-deploy)
```

---

### **Step 4: Test with Sandbox Credentials (30 minutes)**

Once you have Toast sandbox credentials:

1. **Connect Toast in UI:**
   - Log in to Merxus web app as restaurant owner
   - Go to Settings → POS Integration
   - Click "Connect Toast"
   - Enter sandbox credentials
   - Click "Connect"

2. **Test Menu Sync:**
   - Click "Sync Menu"
   - Verify menu items appear in Menu page
   - Check Firestore for `restaurants/{id}/menu` documents

3. **Test Order Push:**
   - Create a test order in Firestore (manually or via AI call)
   - Click "Push to Toast" or wait for auto-push
   - Check Toast sandbox to see if order appears

---

### **Step 5: Set Up Scheduled Menu Sync (15 minutes)**

Create Cloud Scheduler job:

```bash
# Create Pub/Sub topic
gcloud pubsub topics create toast-menu-sync

# Create Cloud Scheduler job
gcloud scheduler jobs create pubsub toast-menu-sync-hourly \
  --schedule="0 * * * *" \
  --topic="toast-menu-sync" \
  --message-body="sync" \
  --location="us-central1"

# Create Cloud Function to handle sync
# (Add to functions/src/index.ts):
export const scheduledToastMenuSync = functions.pubsub
  .topic('toast-menu-sync')
  .onPublish(async () => {
    await scheduleMenuSync();
    return null;
  });
```

Deploy:
```bash
firebase deploy --only functions:scheduledToastMenuSync
```

---

### **Step 6: Add Auto-Push Trigger (15 minutes)**

Add to `functions/src/index.ts`:

```typescript
import { autoPushOrderToToast } from './integrations/toast';

export const onOrderCreated = functions.firestore
  .document('restaurants/{restaurantId}/orders/{orderId}')
  .onCreate(async (snap, context) => {
    const { restaurantId, orderId } = context.params;
    
    // Auto-push to Toast if enabled
    await autoPushOrderToToast(restaurantId, orderId);
  });
```

Deploy:
```bash
firebase deploy --only functions:onOrderCreated
```

---

### **Step 7: Test End-to-End (1 hour)**

1. Make a test call to restaurant phone number
2. AI takes order (e.g., "I'd like a large pepperoni pizza")
3. Order appears in Merxus dashboard
4. Order automatically pushed to Toast POS
5. Verify order in Toast sandbox

---

### **Step 8: Production Rollout (1 week)**

1. Get production Toast credentials
2. Switch `TOAST_ENV` to `production`
3. Pilot with 2-3 friendly restaurants
4. Monitor closely for errors
5. Iterate based on feedback
6. Roll out to all restaurants

---

## 📋 Testing Checklist

Before marking as complete, verify:

- [ ] Restaurant can connect Toast via UI
- [ ] Menu syncs from Toast successfully
- [ ] Orders push to Toast successfully
- [ ] Error handling works (expired token, API down)
- [ ] Manual sync button works
- [ ] Disconnect works without errors
- [ ] Multiple restaurants can connect simultaneously
- [ ] Tokens refresh automatically when expired
- [ ] Orders show Toast order ID in Merxus
- [ ] Menu items map correctly (Merxus ID ↔ Toast GUID)

---

## 💰 Cost Estimate

### Development Time
- ✅ Backend foundation: 3 hours (COMPLETE)
- ✅ Frontend UI: 1 hour (COMPLETE)
- ⏳ Testing & debugging: 4 hours
- ⏳ Production deployment: 2 hours
- **Total:** ~10 hours

### Ongoing Costs
- Toast API: **FREE** (for certified partners)
- Firebase Functions: ~$5-10/month (for auto-push triggers)
- Cloud Scheduler: ~$0.10/month (hourly syncs)
- **Total:** ~$5-10/month

---

## 🔗 Resources

- Toast Developer Portal: https://dev.toasttab.com/
- Toast API Docs: https://doc.toasttab.com/
- Toast Partner Program: https://partners.toasttab.com/
- Firebase Functions Docs: https://firebase.google.com/docs/functions
- Cloud Scheduler Docs: https://cloud.google.com/scheduler/docs

---

## 📞 Support

If you encounter issues:

1. Check Cloud Functions logs: `firebase functions:log`
2. Check Firestore for error messages in `restaurants/{id}/integrations/toast`
3. Verify Toast credentials are correct
4. Check Toast API status: https://status.toasttab.com/

---

**Status:** Foundation complete, awaiting Toast Partner approval to test with real API.
