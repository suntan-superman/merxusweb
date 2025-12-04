# Billing & Claims Fix Documentation

## Problem Summary

Users who signed up for real estate accounts were experiencing two issues:

1. **400 Error on Billing Page**: The billing API returned "Missing tenant information" errors
2. **Wrong Pricing Plans**: Real estate users saw restaurant pricing instead of real estate pricing

## Root Cause

When creating user accounts during onboarding, the custom claims were missing the `tenantId` field. The billing routes expected `tenantId` to be present in the JWT token claims, but it wasn't being set during user creation.

Custom claims were set as:
```javascript
{
  role: 'owner',
  agentId: 'agent_123...',
  type: 'real_estate'
  // Missing: tenantId
}
```

But should have been:
```javascript
{
  role: 'owner',
  agentId: 'agent_123...',
  tenantId: 'agent_123...',  // ← Added
  type: 'real_estate'
}
```

## Changes Made

### 1. Backend Changes

#### A. Updated Onboarding Routes (`web/functions/src/routes/onboarding.ts`)
- ✅ Added `tenantId` field when setting custom claims for **all tenant types**:
  - Real Estate agents: `tenantId: agentId`
  - Voice/Office users: `tenantId: officeId`
  - Restaurant users: `tenantId: restaurantId`

#### B. Enhanced Billing Routes (`web/functions/src/routes/billing.ts`)
- ✅ Added backward compatibility to compute `tenantId` from existing claims if not present
- ✅ Improved error logging to help diagnose issues
- ✅ Updated all billing endpoints:
  - `GET /billing/subscription`
  - `POST /billing/create-checkout-session`
  - `POST /billing/cancel-subscription`

#### C. New Auth Utility Routes (`web/functions/src/routes/auth.ts`)
- ✅ `POST /auth/refresh-claims` - Fixes missing `tenantId` in user claims
- ✅ `GET /auth/claims` - Returns current user claims for debugging

### 2. Frontend Changes

#### A. New API Client (`web/src/api/auth.js`)
- ✅ `getClaims()` - Get current user claims
- ✅ `refreshClaims()` - Refresh and fix user claims

#### B. Enhanced Billing Page (`web/src/pages/BillingPage.jsx`)
- ✅ Detects 400 errors from billing API
- ✅ Shows user-friendly error message with "Fix Account Now" button
- ✅ Automatically refreshes claims when button is clicked
- ✅ Prompts user to log out and log back in after fix

### 3. Utility Scripts

#### A. `web/functions/scripts/fix-user-claims-simple.mjs`
For manual/admin fixes:
```bash
cd web/functions
node scripts/fix-user-claims-simple.mjs user@example.com
```

## Deployment Instructions

### 1. Deploy Backend Changes

```bash
cd web/functions
npm run build
firebase deploy --only functions
```

### 2. Deploy Frontend Changes

```bash
cd web
npm run build
firebase deploy --only hosting
```

Or if using a different hosting:
```bash
npm run build
# Deploy your dist folder to your hosting provider
```

## For Existing Users

### Option 1: Self-Service (Recommended)
1. User navigates to the Billing page
2. They'll see an error message with "Fix Account Now" button
3. User clicks the button
4. System updates their claims
5. User logs out and logs back in
6. Billing page now works correctly

### Option 2: Admin Fix via Script
Run the fix script with the user's email:

```bash
cd web/functions
node scripts/fix-user-claims-simple.mjs user@example.com
```

Then ask the user to log out and log back in.

### Option 3: API Call (For Testing)
If you have the user's auth token, you can call:

```bash
curl -X POST https://us-central1-merxus-f0872.cloudfunctions.net/api/auth/refresh-claims \
  -H "Authorization: Bearer USER_TOKEN"
```

## Testing the Fix

### 1. Test New User Registration
1. Sign up as a new real estate agent
2. Complete onboarding
3. Log in with the credentials
4. Navigate to Billing page
5. Verify: No 400 errors, real estate pricing shown

### 2. Test Existing User Fix
1. Log in as the affected user
2. Navigate to Billing page
3. Verify: "Fix Account Now" button appears
4. Click the button
5. Log out and log back in
6. Navigate to Billing page again
7. Verify: No errors, correct pricing shown

### 3. Verify Claims
Check claims via API:
```bash
curl https://us-central1-merxus-f0872.cloudfunctions.net/api/auth/claims \
  -H "Authorization: Bearer USER_TOKEN"
```

Expected response:
```json
{
  "uid": "abc123...",
  "email": "user@example.com",
  "claims": {
    "role": "owner",
    "agentId": "agent_...",
    "tenantId": "agent_...",
    "type": "real_estate"
  }
}
```

## Future Prevention

All new users (created after this deployment) will automatically have the correct `tenantId` set in their claims. No manual intervention will be needed.

## Support

If users continue to experience issues:

1. Check Firebase Functions logs:
   ```bash
   firebase functions:log
   ```

2. Verify user claims:
   ```bash
   node scripts/fix-user-claims-simple.mjs user@example.com
   ```

3. Check if the user has the correct tenant document in Firestore:
   - Real estate: `/agents/{agentId}`
   - Voice: `/offices/{officeId}`
   - Restaurant: `/restaurants/{restaurantId}`

## Rollback Plan

If issues arise:

1. Revert billing.ts changes:
   ```bash
   git checkout HEAD~1 web/functions/src/routes/billing.ts
   firebase deploy --only functions
   ```

2. Note: Frontend changes are backward compatible and don't need rollback

## Additional Notes

- The billing routes now have backward compatibility, so even users with old claims format should work
- The `tenantId` field is now consistently set across all tenant types
- Error messages are more descriptive for easier troubleshooting
- The self-service fix button provides a better user experience than manual admin intervention
