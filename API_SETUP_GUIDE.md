# API Setup Guide

This guide explains how to configure the API client to connect to your Cloud Functions.

## Problem: 404 Error When Creating Restaurant

If you're seeing a 404 error when trying to create a restaurant, it means the API client can't find your Cloud Functions. Here's how to fix it:

## Solution 1: Run Firebase Emulators (Local Development)

For local development, you need to run the Firebase emulators:

```bash
cd web
firebase emulators:start
```

This will start:
- Functions emulator on `http://localhost:5001`
- Firestore emulator on `http://localhost:8080`
- Auth emulator on `http://localhost:9099`

**Make sure your `.env` file has:**
```env
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_API_BASE_URL=http://localhost:5001/your-project-id/us-central1/api
```

Replace `your-project-id` with your actual Firebase project ID.

## Solution 2: Deploy Cloud Functions (Production)

If you want to use deployed Cloud Functions:

1. **Deploy the functions:**
   ```bash
   cd web
   firebase deploy --only functions
   ```

2. **Update your `.env` file:**
   ```env
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_API_BASE_URL=https://us-central1-your-project-id.cloudfunctions.net/api
   ```

3. **Restart your dev server:**
   ```bash
   yarn dev
   ```

## Solution 3: Check Your Environment Variables

Make sure you have a `.env` file in the `web` directory with:

```env
VITE_FIREBASE_PROJECT_ID=your-actual-project-id
VITE_API_BASE_URL=http://localhost:5001/your-actual-project-id/us-central1/api
```

**Important:** Replace `your-actual-project-id` with your real Firebase project ID.

## How to Find Your Project ID

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click the gear icon ⚙️ → Project settings
4. The **Project ID** is shown at the top

## Verify API Configuration

The API client will log its configuration in the browser console when in development mode. Open your browser's developer console and look for:

```
🔧 API Configuration: {
  baseURL: "http://localhost:5001/your-project-id/us-central1/api",
  projectId: "your-project-id",
  env: "development"
}
```

If the URL looks wrong, check your `.env` file.

## Common Issues

### Issue: "Cannot connect to API server"
**Solution:** Make sure Firebase emulators are running:
```bash
firebase emulators:start
```

### Issue: "404 Not Found"
**Solution:** 
1. Check that your project ID in `.env` matches your Firebase project
2. Make sure the Functions emulator is running
3. Verify the route exists in `functions/src/index.ts`

### Issue: "CORS error"
**Solution:** The CORS middleware should handle this, but if you see CORS errors:
1. Make sure `cors({ origin: true })` is in `functions/src/index.ts`
2. Check that your API base URL is correct

## Testing the API

Once configured, you can test the API by:

1. Opening browser console
2. Looking for API configuration log
3. Trying to create a restaurant
4. Checking the Network tab to see the actual request URL

The request should go to:
- Local: `http://localhost:5001/your-project-id/us-central1/api/merxus/restaurants`
- Production: `https://us-central1-your-project-id.cloudfunctions.net/api/merxus/restaurants`

## Quick Checklist

- [ ] `.env` file exists in `web/` directory
- [ ] `VITE_FIREBASE_PROJECT_ID` is set correctly
- [ ] `VITE_API_BASE_URL` is set correctly
- [ ] Firebase emulators are running (for local dev)
- [ ] Cloud Functions are deployed (for production)
- [ ] Dev server restarted after `.env` changes

