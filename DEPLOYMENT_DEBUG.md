# Debugging Cloud Functions Deployment

## Get More Detailed Error Information

The generic "failed to create function" error doesn't give us much info. Try these steps:

### 1. Check Firebase Console Logs

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **merxus**
3. Go to **Functions** tab
4. Check if there are any error messages or logs

### 2. Check Google Cloud Console Logs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select project: **merxus-f0872**
3. Go to **Cloud Functions**
4. Check for any error messages
5. Go to **Logs Explorer** and filter for errors

### 3. Try Deploying with Verbose Output

```bash
firebase deploy --only functions --debug
```

This will show more detailed information about what's happening.

### 4. Check if Function Already Exists

If a function with the same name already exists, you might need to delete it first:

```bash
# List existing functions
firebase functions:list

# Delete the function if it exists
gcloud functions delete api --region=us-central1 --project=merxus-f0872
```

Or delete it from Google Cloud Console:
1. Go to [Cloud Functions](https://console.cloud.google.com/functions)
2. Select project: **merxus-f0872**
3. Find function named **api**
4. Delete it if it exists

### 5. Verify Build Output

Make sure the TypeScript compiles correctly:

```bash
cd web/functions
npm run build
```

Check that `lib/index.js` exists and looks correct.

### 6. Check for Missing Dependencies

Make sure all dependencies are installed:

```bash
cd web/functions
npm install
```

### 7. Try a Different Function Name

If "api" is causing issues, try renaming it temporarily:

In `web/functions/src/index.ts`:
```typescript
export const merxusApi = functions.region('us-central1').https.onRequest(app);
```

Then update your frontend `.env`:
```env
VITE_API_BASE_URL=https://us-central1-merxus-f0872.cloudfunctions.net/merxusApi
```

### 8. Check Runtime Configuration

Make sure the runtime is correctly specified. The function should use Node.js 20.

### 9. Verify Permissions Again

Make sure you have:
- Cloud Functions Admin role
- Cloud Build Service Account has proper permissions
- Billing is enabled

### 10. Check for Quota Limits

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Go to **IAM & Admin** → **Quotas**
3. Search for "Cloud Functions"
4. Check if you've hit any quota limits

## Common Issues

### Issue: Function name conflict
**Solution:** Delete existing function or use a different name

### Issue: Missing environment variables
**Solution:** Some functions might need environment variables. Check if your function code requires any.

### Issue: Build errors
**Solution:** Run `npm run build` manually and check for TypeScript errors

### Issue: Permissions
**Solution:** Make sure Cloud Build Service Account has proper permissions

## Next Steps

1. Try `firebase deploy --only functions --debug` for more info
2. Check Firebase Console for detailed error messages
3. Check Google Cloud Console logs
4. Verify the function doesn't already exist with a different configuration

