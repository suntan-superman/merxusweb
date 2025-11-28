# Firebase Project Setup Guide

This guide will walk you through setting up a Firebase project for the Merxus application.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter project name: `merxus` (or your preferred name)
4. Click **Continue**
5. **Disable** Google Analytics (optional, you can enable later if needed)
6. Click **Create project**
7. Wait for project creation to complete
8. Click **Continue**

## Step 2: Enable Authentication

1. In Firebase Console, click **Authentication** in the left sidebar
2. Click **Get started**
3. Go to the **Sign-in method** tab
4. Click on **Email/Password**
5. Toggle **Enable** to ON
6. Click **Save**

## Step 3: Create Firestore Database

1. Click **Firestore Database** in the left sidebar
2. Click **Create database**
3. Select **Start in production mode** (we'll deploy security rules)
4. Choose a location (e.g., `us-central` or closest to your users)
5. Click **Enable**

## Step 4: Enable Cloud Functions

1. Click **Functions** in the left sidebar
2. If prompted, click **Get started**
3. You may need to upgrade to the Blaze plan (pay-as-you-go)
   - Don't worry, Firebase has a generous free tier
   - You won't be charged unless you exceed free limits

## Step 5: Enable Storage (Optional, for menu images)

1. Click **Storage** in the left sidebar
2. Click **Get started**
3. Start in **production mode**
4. Use the same location as Firestore
5. Click **Done**

## Step 6: Get Web App Configuration

1. Click the **gear icon** (⚙️) next to "Project Overview"
2. Select **Project settings**
3. Scroll down to **Your apps** section
4. Click the **Web icon** (`</>`)
5. Register app:
   - App nickname: `Merxus Web`
   - Check "Also set up Firebase Hosting" (optional)
   - Click **Register app**
6. Copy the Firebase configuration object

It will look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "merxus-xxxxx.firebaseapp.com",
  projectId: "merxus-xxxxx",
  storageBucket: "merxus-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Step 7: Set Up Environment Variables

1. In your project, create `.env` file in the `web` directory:
   ```bash
   cd web
   cp .env.example .env
   ```

2. Open `.env` and fill in your Firebase config:
   ```env
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=merxus-xxxxx.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=merxus-xxxxx
   VITE_FIREBASE_STORAGE_BUCKET=merxus-xxxxx.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abcdef

   # API Base URL (for local development with emulator)
   VITE_API_BASE_URL=http://localhost:5001/merxus/us-central1/api
   ```

   **Note:** Replace `merxus` in the API URL with your actual project ID.

## Step 8: Initialize Firebase CLI in Project

1. Install Firebase CLI globally (if not already installed):
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```
   This will open a browser for authentication.

3. Initialize Firebase in your project:
   ```bash
   cd web
   firebase init
   ```

4. When prompted, select:
   - ✅ **Firestore**: Configure security rules and indexes
   - ✅ **Functions**: Configure a Cloud Functions directory
   - ✅ **Hosting**: Configure files for Firebase Hosting (optional)

5. For Firestore:
   - Use existing `firestore.rules` file? **Yes**
   - Use existing `firestore.indexes.json`? **Yes**

6. For Functions:
   - Language: **TypeScript**
   - ESLint: **Yes** (optional)
   - Install dependencies: **Yes**

7. For Hosting (if selected):
   - Public directory: `dist`
   - Single-page app: **Yes**
   - Set up automatic builds: **No** (or Yes if you want)

## Step 9: Deploy Firestore Rules

Deploy the security rules we created:

```bash
cd web
firebase deploy --only firestore:rules
```

## Step 10: Set Up Test Users

Now you can create test users. You have two options:

### Option A: Using the Setup Script (Recommended)

1. Make sure you're logged in with Firebase CLI:
   ```bash
   firebase login
   ```

2. Install firebase-admin (if not already installed):
   ```bash
   cd web
   yarn add -D firebase-admin
   ```

3. Run the setup script:
   ```bash
   node scripts/setup-test-users.mjs
   ```

3. Follow the prompts to create:
   - Restaurant owner/manager/staff users
   - Merxus admin users

### Option B: Using Firebase Console + Manual Claims

1. **Create user in Firebase Console:**
   - Go to Authentication → Users
   - Click "Add user"
   - Enter email and password
   - Note the UID

2. **Set custom claims using a script:**
   Create a file `web/scripts/set-claims.js`:
   ```javascript
   const admin = require('firebase-admin');
   admin.initializeApp();
   
   const uid = 'USER_UID_HERE';
   const restaurantId = 'test-restaurant-1';
   
   admin.auth().setCustomUserClaims(uid, {
     role: 'owner',
     restaurantId: restaurantId,
     type: 'restaurant'
   }).then(() => {
     console.log('Claims set!');
     process.exit(0);
   });
   ```

   Run it:
   ```bash
   node scripts/set-claims.js
   ```

## Step 11: Test the Setup

1. **Start the frontend:**
   ```bash
   cd web
   yarn dev
   ```

2. **Start Firebase Emulators (for local development):**
   ```bash
   cd web
   firebase emulators:start
   ```
   
   This will start:
   - Firestore emulator on port 8080
   - Functions emulator on port 5001
   - Auth emulator on port 9099

3. **Update `.env` for emulator:**
   ```env
   VITE_API_BASE_URL=http://localhost:5001/merxus/us-central1/api
   ```

4. **Test login:**
   - Navigate to `http://localhost:3000/login`
   - Use the test user credentials you created
   - You should be redirected to `/restaurant` dashboard

## Step 12: Create Initial Restaurant Data (Optional)

To test the dashboard with data, you can create some sample data in Firestore:

1. Go to Firestore Database in Firebase Console
2. Start a collection: `restaurants`
3. Create a document with ID: `test-restaurant-1`
4. Add a subcollection: `meta`
5. Create a document: `settings` with:
   ```json
   {
     "restaurantId": "test-restaurant-1",
     "name": "Test Restaurant",
     "phoneNumber": "+15551234567",
     "timezone": "America/Los_Angeles",
     "businessHours": {
       "monday": { "open": "11:00", "close": "21:00", "closed": false },
       "tuesday": { "open": "11:00", "close": "21:00", "closed": false }
     },
     "notifySmsNumbers": [],
     "notifyEmailAddresses": []
   }
   ```

## Troubleshooting

### Issue: "Firebase: Error (auth/configuration-not-found)"
- Make sure `.env` file exists and has correct values
- Restart the dev server after changing `.env`

### Issue: "Permission denied" in Firestore
- Deploy Firestore rules: `firebase deploy --only firestore:rules`
- Check that user has proper custom claims

### Issue: Functions emulator not starting
- Make sure you've run `npm install` in `web/functions`
- Build the functions: `cd web/functions && npm run build`

### Issue: Can't create users
- Make sure Authentication is enabled
- Check that Email/Password provider is enabled
- For the script, ensure you're logged in: `firebase login`

## Next Steps

Once Firebase is set up:

1. ✅ Create test users with proper roles
2. ✅ Test login flow
3. ✅ Verify dashboard access
4. ✅ Test API endpoints
5. ✅ Deploy to production when ready

## Production Deployment

When ready to deploy:

1. **Deploy Functions:**
   ```bash
   cd web
   firebase deploy --only functions
   ```

2. **Update `.env` with production API URL:**
   ```env
   VITE_API_BASE_URL=https://us-central1-<project-id>.cloudfunctions.net/api
   ```

3. **Build and deploy frontend:**
   ```bash
   yarn build
   firebase deploy --only hosting
   ```

## Quick Reference

**Firebase Console:** https://console.firebase.google.com/

**Project Settings:** Gear icon → Project settings

**Authentication:** Authentication → Users / Sign-in method

**Firestore:** Firestore Database

**Functions:** Functions

**Storage:** Storage

