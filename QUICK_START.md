# Quick Start Guide

Get up and running with Merxus in 10 minutes!

## Prerequisites

- Node.js 18+ installed
- Yarn installed (`npm install -g yarn`)
- Firebase account (free tier works)

## Step-by-Step Setup

### 1. Install Dependencies

```bash
cd web
yarn install

cd functions
npm install
```

### 2. Set Up Firebase Project

Follow the detailed guide in `FIREBASE_SETUP_GUIDE.md`, or quick version:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project
3. Enable:
   - Authentication (Email/Password)
   - Firestore Database
   - Cloud Functions
4. Get web app config from Project Settings
5. Copy config to `.env` file (see `.env.example`)

### 3. Initialize Firebase CLI

```bash
firebase login
cd web
firebase init
```

Select:
- Firestore (use existing rules)
- Functions (TypeScript)
- Hosting (optional)

### 4. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 5. Create Test User

**Option A: Using Script**
```bash
cd web
yarn add -D firebase-admin  # Install if needed
node scripts/setup-test-users.mjs
```

**Option B: Manual**
1. Create user in Firebase Console (Authentication → Users)
2. Use the script to set custom claims (see `TEST_USERS_SETUP.md`)

### 6. Start Development

**Terminal 1: Frontend**
```bash
cd web
yarn dev
```

**Terminal 2: Firebase Emulators (optional, for local backend)**
```bash
cd web
firebase emulators:start
```

**Terminal 3: Build Functions (if using emulators)**
```bash
cd web/functions
npm run build
```

### 7. Test Login

1. Open `http://localhost:3000`
2. Click "Login" or go to `/login`
3. Use your test user credentials
4. You should be redirected to `/restaurant` dashboard

## Test User Example

Create a restaurant owner:
- Email: `owner@test.com`
- Password: `password123`
- Role: `owner`
- Restaurant ID: `test-restaurant-1`
- Type: `restaurant`

## Common Issues

**"Configuration not found"**
→ Check `.env` file exists and has correct Firebase config

**"Permission denied"**
→ Deploy Firestore rules: `firebase deploy --only firestore:rules`

**"Restaurant ID required"**
→ User needs custom claims set (use setup script)

**Functions won't build**
→ Run `npm install` in `web/functions` directory

## What's Next?

- ✅ Phase 1: Foundation & Authentication (Complete)
- ✅ Phase 2: Core Restaurant Pages (Complete)
- 🔄 Phase 3: Settings & User Management (Next)
- ⏳ Phase 4: Merxus Admin Portal
- ⏳ Phase 5: Real-time Features
- ⏳ Phase 6: Testing & Deployment

## Need Help?

- See `FIREBASE_SETUP_GUIDE.md` for detailed Firebase setup
- See `TEST_USERS_SETUP.md` for user creation options
- See `PHASE1_SETUP.md` for Phase 1 details

