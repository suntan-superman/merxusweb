# Fixing Cloud Functions Deployment Permission Error (403)

## Error: "The caller does not have permission"

This error usually means one of these issues:

## Solution 1: Enable Cloud Functions API

The Cloud Functions API might not be enabled for your project.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **merxus-f0872**
3. Go to **APIs & Services** → **Library**
4. Search for "Cloud Functions API"
5. Click on it and click **Enable**

Also enable:
- **Cloud Build API** (required for Functions)
- **Cloud Logging API** (for logs)

## Solution 2: Check Your Permissions

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **merxus**
3. Click gear icon ⚙️ → **Project settings**
4. Go to **Users and permissions** tab
5. Make sure your account has at least **Editor** or **Owner** role

If you're not listed:
- Ask the project owner to add you
- Or make sure you're logged in with the correct Google account

## Solution 3: Enable Billing (Required for Cloud Functions)

Cloud Functions requires a **Blaze (pay-as-you-go) plan**, even though there's a generous free tier.

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **merxus**
3. Click gear icon ⚙️ → **Usage and billing**
4. Click **Modify plan** or **Upgrade**
5. Select **Blaze plan**
6. Add a billing account (credit card required, but you won't be charged unless you exceed free tier)

**Note:** The free tier includes:
- 2 million function invocations/month
- 400,000 GB-seconds compute time/month
- 200,000 CPU-seconds/month

You likely won't be charged unless you have significant traffic.

## Solution 4: Check Google Cloud IAM Permissions

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **merxus-f0872**
3. Go to **IAM & Admin** → **IAM**
4. Find your account
5. Make sure you have one of these roles:
   - **Owner**
   - **Editor**
   - **Cloud Functions Admin**

If you don't have the right role:
- Ask the project owner to grant you the role
- Or if you're the owner, make sure you're logged in with the correct account

## Solution 5: Verify Project Ownership

Make sure you're the project owner or have been granted proper access:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **merxus**
3. Click gear icon ⚙️ → **Project settings**
4. Check **Users and permissions** tab
5. Your account should be listed with **Owner** role

## Quick Checklist

- [ ] Cloud Functions API is enabled
- [ ] Cloud Build API is enabled
- [ ] Billing is enabled (Blaze plan)
- [ ] Your account has Editor/Owner role in Firebase
- [ ] Your account has proper IAM permissions in Google Cloud
- [ ] You're logged in with the correct Google account

## After Fixing Permissions

Once you've fixed the permissions:

1. **Re-authenticate:**
   ```bash
   firebase logout
   firebase login
   ```

2. **Try deploying again:**
   ```bash
   firebase deploy --only functions
   ```

## Alternative: Use Firebase Emulators for Development

If you can't enable billing or fix permissions right now, you can use local emulators:

```bash
firebase emulators:start
```

Then update your `.env`:
```env
VITE_API_BASE_URL=http://localhost:5001/merxus-f0872/us-central1/api
```

This lets you develop locally without deploying.

