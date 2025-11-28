# Firebase Service Account Key Setup

A service account key allows you to use Firebase Admin SDK in scripts and applications. This is useful for the test user setup script.

## Quick Steps

### 1. Go to Firebase Console
- Navigate to [Firebase Console](https://console.firebase.google.com/)
- Select your project

### 2. Open Project Settings
- Click the **gear icon** (⚙️) next to "Project Overview"
- Select **Project settings**

### 3. Go to Service Accounts Tab
- Click on the **"Service accounts"** tab at the top
- You'll see a section titled "Firebase Admin SDK"

### 4. Generate New Private Key
- Click the **"Generate new private key"** button
- A dialog will appear warning you about keeping the key secure
- Click **"Generate key"**
- A JSON file will be downloaded automatically (e.g., `merxus-xxxxx-firebase-adminsdk-xxxxx-xxxxxxxxxx.json`)

**⚠️ Important:** This file contains sensitive credentials. Keep it secure and never commit it to version control!

### 5. Save the Key File
1. Rename the downloaded file to: `serviceAccountKey.json`
2. Move it to: `web/scripts/serviceAccountKey.json`
3. The script will automatically detect and use it

### 6. Verify .gitignore
The `.gitignore` file already includes patterns to prevent committing service account keys:
- `**/serviceAccountKey.json`
- `**/*-firebase-adminsdk-*.json`

## Using the Service Account Key

Once you place the key file at `web/scripts/serviceAccountKey.json`, the setup script will automatically detect and use it:

```bash
cd web
node scripts/setup-test-users.mjs
```

The script will show: `✅ Using service account key for authentication`

## Alternative: Using Firebase CLI (No Key File Needed)

If you prefer not to use a service account key file:

1. **Login to Firebase CLI:**
   ```bash
   firebase login
   ```

2. **Run the script:**
   ```bash
   node scripts/setup-test-users.mjs
   ```

The script will automatically use your CLI credentials and show: `✅ Using Firebase CLI authentication`

## Security Best Practices

1. **Never commit service account keys to Git**
   - The `.gitignore` is already configured
   - If accidentally committed, rotate the key immediately in Firebase Console

2. **Store keys securely**
   - Don't share keys in chat/email
   - Use environment variables in production
   - Restrict key permissions when possible

3. **Rotate keys regularly**
   - Generate new keys periodically
   - Delete old unused keys from Firebase Console

## Troubleshooting

### "Permission denied" error
- Make sure the service account has proper permissions (should have full access by default)
- Check that the key file path is correct: `web/scripts/serviceAccountKey.json`
- Verify the JSON file is valid

### "Invalid credentials" error
- Regenerate the key if it's been compromised
- Make sure you're using the correct project's service account
- Check that the key file hasn't been corrupted

### Script can't find the key file
- Make sure the file is named exactly: `serviceAccountKey.json`
- Place it in: `web/scripts/serviceAccountKey.json`
- Check file permissions (should be readable)

### Script uses CLI instead of key file
- This is fine! The script will work with either method
- If you want to force using the key file, make sure it's in the correct location
- If you want to use CLI, just run `firebase login` first

## Visual Guide

```
Firebase Console
├── Project Settings (⚙️ icon)
    ├── General tab
    ├── Service accounts tab ← Go here!
    │   └── Firebase Admin SDK section
    │       └── "Generate new private key" button ← Click this!
    ├── Your apps tab
    └── ...
```

## File Structure After Setup

```
web/
├── scripts/
│   ├── serviceAccountKey.json  ← Your service account key (gitignored)
│   └── setup-test-users.mjs
├── .gitignore                  ← Already configured to ignore keys
└── ...
```

## Quick Reference

**Where to get the key:**
- Firebase Console → Project Settings → Service Accounts → Generate new private key

**Where to save it:**
- `web/scripts/serviceAccountKey.json`

**How to use it:**
- Just place the file in the scripts directory
- The script will automatically detect and use it
- No code changes needed!
