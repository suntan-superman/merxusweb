# Quick Fix: Authentication Error

If you're seeing this error:
```
Could not load the default credentials
```

## Solution: Create Service Account Key

The script needs a service account key file. Here's the fastest way to get it:

### Step 1: Get the Key File

1. Open: https://console.firebase.google.com/
2. Select your project
3. Click **⚙️ (gear icon)** → **Project settings**
4. Click **"Service accounts"** tab
5. Click **"Generate new private key"** button
6. Click **"Generate key"** in the warning dialog
7. A JSON file downloads (e.g., `merxus-xxxxx-firebase-adminsdk-xxxxx.json`)

### Step 2: Save the Key File

1. Rename the downloaded file to: `serviceAccountKey.json`
2. Move it to: `web/scripts/serviceAccountKey.json`

**File structure should be:**
```
web/
└── scripts/
    ├── serviceAccountKey.json  ← Your key file here
    └── setup-test-users.mjs
```

### Step 3: Run the Script Again

```bash
cd web
node scripts/setup-test-users.mjs
```

You should now see:
```
✅ Using service account key for authentication
```

## Why This Happens

- `firebase login` is for Firebase CLI tools (deploy, emulators, etc.)
- Firebase Admin SDK needs either:
  - A service account key file (recommended for scripts), OR
  - Google Cloud application default credentials (`gcloud auth application-default login`)

The service account key is the simplest solution for this script.

## Security Note

The `.gitignore` file is already configured to prevent committing the key file. Never commit service account keys to version control!

