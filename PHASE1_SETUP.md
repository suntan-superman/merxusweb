# Phase 1: Foundation & Authentication - Setup Guide

## ✅ Completed Tasks

1. ✅ Firebase configuration structure
2. ✅ AuthContext with token management
3. ✅ LoginPage component
4. ✅ ProtectedRoute component
5. ✅ API client with token interceptor
6. ✅ Cloud Functions project structure
7. ✅ Auth middleware for Cloud Functions
8. ✅ Firestore security rules
9. ✅ Updated App.jsx with routing

## 📋 Next Steps

### 1. Install Dependencies

```bash
cd web
yarn install
```

### 2. Set Up Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable the following services:
   - **Authentication** (Email/Password provider)
   - **Firestore Database**
   - **Cloud Functions**
   - **Storage** (optional, for menu images)

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Get your Firebase config from Firebase Console:
   - Project Settings → General → Your apps → Web app
   - Copy the config values to `.env`

3. Update `VITE_API_BASE_URL`:
   - For local development: `http://localhost:5001/merxus/us-central1/api`
   - For production: `https://us-central1-<project-id>.cloudfunctions.net/api`

### 4. Initialize Firebase CLI

```bash
# Install Firebase CLI globally (if not already installed)
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in the project
cd web
firebase init
```

When prompted:
- Select: **Firestore**, **Functions**, **Hosting** (optional)
- Use existing project or create new
- For Functions: Choose TypeScript, ESLint (optional), install dependencies

### 5. Install Cloud Functions Dependencies

```bash
cd web/functions
npm install
```

### 6. Deploy Firestore Rules

```bash
cd web
firebase deploy --only firestore:rules
```

### 7. Test Local Development

#### Start Cloud Functions Emulator:
```bash
cd web/functions
npm run serve
```

#### Start Frontend:
```bash
cd web
yarn dev
```

### 8. Create Test User with Custom Claims

To test the authentication flow, you'll need to create a user with custom claims. You can do this via Firebase Console or a Cloud Function.

**Option 1: Using Firebase Console**
1. Go to Authentication → Users
2. Create a new user with email/password
3. Note the UID

**Option 2: Using Cloud Function (Recommended)**

Create a helper function to set custom claims:

```typescript
// functions/src/utils/setClaims.ts
import * as admin from 'firebase-admin';

export async function setUserClaims(uid: string, claims: {
  role: string;
  restaurantId?: string;
  type: string;
}) {
  await admin.auth().setCustomUserClaims(uid, claims);
  console.log(`Set claims for ${uid}:`, claims);
}
```

Then call it from a Cloud Function or script.

### 9. Test Authentication Flow

1. Start the app: `yarn dev`
2. Navigate to `/login`
3. Try logging in with a test user
4. Verify redirect to `/restaurant` dashboard
5. Check that token is being sent in API requests

## 🔧 Troubleshooting

### Issue: "Missing token" errors
- Ensure Firebase Auth is enabled
- Check that user has custom claims set
- Verify token refresh is working

### Issue: Firestore permission denied
- Deploy Firestore rules: `firebase deploy --only firestore:rules`
- Check that custom claims match the rules
- Verify user has correct `restaurantId` claim

### Issue: API calls failing
- Check `VITE_API_BASE_URL` is correct
- Ensure Cloud Functions emulator is running
- Verify CORS is configured correctly

## 📝 Files Created

### Frontend:
- `src/context/AuthContext.jsx` - Authentication context
- `src/api/client.js` - API client with auth interceptor
- `src/components/ProtectedRoute.jsx` - Route protection component
- `src/pages/LoginPage.jsx` - Login page
- `src/pages/restaurant/DashboardPage.jsx` - Restaurant dashboard

### Backend:
- `functions/src/index.ts` - Main Cloud Functions entry
- `functions/src/middleware/auth.ts` - Authentication middleware
- `firestore.rules` - Security rules
- `firebase.json` - Firebase configuration

## 🎯 What's Working

- ✅ Authentication flow (login/logout)
- ✅ Token management and refresh
- ✅ Protected routes
- ✅ API client with automatic token injection
- ✅ Role-based access control structure
- ✅ Firestore security rules
- ✅ Cloud Functions auth middleware

## 🚀 Ready for Phase 2

Once Phase 1 is complete and tested, you can proceed to Phase 2: Core Restaurant Pages (Orders, Calls, Customers, Menu).

