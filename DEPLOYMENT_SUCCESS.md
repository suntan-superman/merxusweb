# Deployment Successful! 🎉

Your Cloud Functions have been deployed successfully!

## Function URL

Your API is now available at:
```
https://us-central1-merxus-f0872.cloudfunctions.net/api
```

## Next Steps

### 1. Update Environment Variables

Update your `.env` file in the `web/` directory:

```env
VITE_FIREBASE_PROJECT_ID=merxus-f0872
VITE_API_BASE_URL=https://us-central1-merxus-f0872.cloudfunctions.net/api
```

### 2. Restart Your Dev Server

If your dev server is running, restart it to pick up the new environment variables:

```bash
# Stop the current server (Ctrl+C)
# Then restart:
yarn dev
```

### 3. Test the API

You can test the health endpoint:
```
https://us-central1-merxus-f0872.cloudfunctions.net/api/health
```

Or test from your app by trying to create a restaurant.

### 4. Verify in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **merxus**
3. Go to **Functions** tab
4. You should see the `api` function listed

### 5. Check Logs

To view function logs:
```bash
firebase functions:log
```

Or in Firebase Console:
- Go to **Functions** → Click on `api` → **Logs** tab

## Testing the Restaurant Creation

Now you should be able to:
1. Log in as a Merxus admin
2. Go to `/merxus/restaurants/new`
3. Create a restaurant
4. It should work! 🎉

## Troubleshooting

If you get CORS errors:
- The CORS middleware should handle this automatically
- Check that `cors({ origin: true })` is in your function code

If you get 401 errors:
- Make sure you're logged in
- Check that the auth token is being sent correctly

If you get 404 errors:
- Verify the API base URL in `.env` matches the function URL above
- Make sure you restarted the dev server after updating `.env`

## Future Deployments

To deploy updates:
```bash
cd web
firebase deploy --only functions
```

The function will be updated with your latest code.

