# Setting Up Test Users

To test the authentication system, you need to create users with proper custom claims (role, restaurantId, type). Here are several ways to do this:

## Method 1: Using the Setup Script (Recommended)

We've created a Node.js script to help you set up test users:

```bash
cd web
node scripts/setup-test-users.js
```

**Prerequisites:**
- Firebase CLI installed and logged in: `firebase login`
- Or have a service account key file

The script will guide you through creating:
- Restaurant users (owner/manager/staff) with restaurantId
- Merxus admin users (merxus_admin/merxus_support)

## Method 2: Using Firebase Console (Manual)

### Step 1: Create User in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Users**
4. Click **Add user**
5. Enter email and password
6. Note the **UID** of the created user

### Step 2: Set Custom Claims

You need to set custom claims using Firebase Admin SDK. You can do this via:

**Option A: Cloud Function (Recommended)**

Create a temporary Cloud Function or use the admin API endpoint:

```bash
# After deploying functions, call the admin endpoint
curl -X POST https://us-central1-<project-id>.cloudfunctions.net/api/admin/test-user \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <merxus-admin-token>" \
  -d '{
    "email": "owner@restaurant.com",
    "password": "password123",
    "role": "owner",
    "restaurantId": "rest123",
    "type": "restaurant"
  }'
```

**Option B: Node.js Script**

Create a simple script:

```javascript
const admin = require('firebase-admin');
admin.initializeApp();

const uid = 'USER_UID_FROM_CONSOLE';
const restaurantId = 'rest123';

admin.auth().setCustomUserClaims(uid, {
  role: 'owner',
  restaurantId: restaurantId,
  type: 'restaurant'
}).then(() => {
  console.log('Custom claims set successfully');
});
```

## Method 3: Quick Test User Setup

For quick testing, here's a sample setup:

### Restaurant Owner User
- **Email:** `owner@test.com`
- **Password:** `password123`
- **Role:** `owner`
- **Restaurant ID:** `test-restaurant-1`
- **Type:** `restaurant`

### Restaurant Manager User
- **Email:** `manager@test.com`
- **Password:** `password123`
- **Role:** `manager`
- **Restaurant ID:** `test-restaurant-1`
- **Type:** `restaurant`

### Restaurant Staff User
- **Email:** `staff@test.com`
- **Password:** `password123`
- **Role:** `staff`
- **Restaurant ID:** `test-restaurant-1`
- **Type:** `restaurant`

### Merxus Admin User
- **Email:** `admin@merxus.com`
- **Password:** `password123`
- **Role:** `merxus_admin`
- **Type:** `merxus`

## Important Notes

1. **Custom Claims**: Users MUST have custom claims set to access the dashboard. Without them, they'll be redirected to login.

2. **Token Refresh**: After setting custom claims, users need to:
   - Sign out and sign back in, OR
   - Get a fresh ID token (the app does this automatically)

3. **Firestore User Document**: For restaurant users, also create a document at:
   ```
   restaurants/{restaurantId}/users/{uid}
   ```
   With fields: `uid`, `email`, `displayName`, `role`, `invitedAt`, `disabled`

4. **Restaurant Settings**: You may also want to create a settings document:
   ```
   restaurants/{restaurantId}/meta/settings
   ```

## Testing the Login

Once you've created a user with proper claims:

1. Start the app: `yarn dev`
2. Navigate to `/login`
3. Enter the email and password
4. You should be redirected to `/restaurant` (for restaurant users) or `/merxus` (for admin users)

## Troubleshooting

**Issue: User can't access dashboard after login**
- Check that custom claims are set correctly
- User needs to sign out and sign back in to get fresh token
- Check browser console for errors

**Issue: "Restaurant ID required" error**
- Verify the user has `restaurantId` in their custom claims
- Check that the token includes the claims (may need to refresh)

**Issue: Permission denied in Firestore**
- Deploy Firestore rules: `firebase deploy --only firestore:rules`
- Verify the user's `restaurantId` matches the data they're trying to access

