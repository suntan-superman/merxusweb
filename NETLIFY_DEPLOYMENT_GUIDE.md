# Netlify Deployment Guide - Phase 2 & 3

## Quick Start

### 1. Build the Frontend

```bash
cd web
yarn install
yarn build
```

### 2. Deploy to Netlify

**Option A: Using Netlify CLI**

```bash
# Install Netlify CLI (if not already installed)
npm install -g netlify-cli

# Deploy from web directory
cd web
netlify deploy --prod --dir=dist
```

**Option B: Using GitHub Actions (Recommended)**

If your repo is on GitHub:
1. Push to your main branch
2. Netlify auto-builds and deploys automatically
3. Check deployment status at: https://app.netlify.com/sites/[your-site-name]

**Option C: Drag & Drop**

1. Go to https://app.netlify.com
2. Drag the `web/dist` folder to deploy

---

## Environment Variables (Netlify)

No environment variable changes needed for Phase 2 & 3 deployment.

If you need to set environment variables:
1. Go to Netlify dashboard → Site settings → Environment
2. Do NOT touch PAYMENT_SIMULATION (already configured)
3. Add any new vars if needed

---

## What Changed in Frontend

### New File
- `web/src/pages/voice/PaymentAnalyticsPage.jsx` (450+ lines)
  - Admin dashboard for payment analytics
  - 4 tabs: Overview, Callers, Transactions, Settings

### Modified Files
- `web/src/pages/voice/VoiceDashboardPage.jsx`
  - Fixed query to use `endedAt` instead of `createdAt`
  - Now shows actual call data matching VoiceCallsPage

### Required Dependencies
Already installed:
- ✅ `semantic-ui-react` (UI components)
- ✅ `recharts` (Charts for analytics)
- ✅ `axios` (API calls)

---

## Verification After Deployment

```bash
# Check the deployed site
netlify sites:list

# View deployment logs
netlify logs:functions

# Test the site
# Visit: https://merxus.web.app (or your custom domain)
```

---

## Next: Wire Up Routing

To make the Payment Analytics page accessible, add it to the Voice navigation menu:

### File: `web/src/pages/voice/VoiceSettingsPage.jsx`

Find where navigation links are defined and add:

```jsx
<Link to="/voice/analytics">
  <Icon name="chart line" />
  Payment Analytics
</Link>
```

Or create a menu item in the sidebar:

```jsx
<Menu.Item
  as={Link}
  to={`/voice/${tenantId}/analytics`}
  name="analytics"
>
  <Icon name="chart line" /> Payment Analytics
</Menu.Item>
```

### File: `web/src/pages/voice/MainStack.jsx` (or equivalent router)

Add the route:

```jsx
<Route 
  path="/voice/:tenantId/analytics" 
  element={<PaymentAnalyticsPage />} 
/>
```

Then import:
```jsx
import PaymentAnalyticsPage from './PaymentAnalyticsPage';
```

---

## Testing Before Deployment

### 1. Run Local Dev Server

```bash
cd web
yarn dev
```

### 2. Test Payment Analytics Page

- Navigate to `http://localhost:5173/voice/test-tenant/analytics`
- You should see the 4-tab dashboard
- Tabs will show "loading..." (waiting for API data)

### 3. Test Voice Dashboard

- Navigate to `http://localhost:5173/voice/dashboard`
- Should now show actual call counts instead of 0's
- Verify stats match VoiceCallsPage data

---

## Deployment Checklist

- [ ] Frontend builds without errors: `yarn build`
- [ ] No console errors in dev: `yarn dev`
- [ ] VoiceDashboardPage now shows actual call data
- [ ] PaymentAnalyticsPage component loads
- [ ] API endpoints are registered in backend
- [ ] Backend is deployed to Cloud Run
- [ ] Run: `netlify deploy --prod --dir=dist` (or auto-deploy via GitHub)
- [ ] Test in production: https://merxus.web.app

---

## Rollback Instructions

If something breaks:

```bash
# See deployment history
netlify deploys:list

# Rollback to previous deploy
netlify deploy:rollback

# Or manually re-deploy previous version
git checkout HEAD~1 -- web/src/pages/voice/
yarn build
netlify deploy --prod --dir=dist
```

---

## Netlify Build Settings

Your `netlify.toml` should already have:

```toml
[build]
  command = "cd web && yarn build"
  publish = "web/dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

If not, add it to your repo root.

---

## Performance Notes

- Dashboard loads 4 API calls in parallel (stats, callers, attempts, policy)
- Charts re-render when selectedDays changes
- Table pagination handled client-side for first 50 callers
- Netlify CDN caches static assets (fast global delivery)

---

## Common Issues & Fixes

### Issue: "Cannot find module PaymentAnalyticsPage"
**Fix:** Verify file path matches import:
```jsx
// Correct:
import PaymentAnalyticsPage from './PaymentAnalyticsPage';
```

### Issue: Charts not rendering
**Fix:** Ensure Recharts is installed:
```bash
yarn add recharts
```

### Issue: API calls return 404
**Fix:** Verify backend is deployed and endpoints are registered:
```bash
curl https://your-backend.run.app/voice/analytics/payment-stats/test?days=30
```

### Issue: Dashboard still shows 0 calls
**Fix:** 
1. Run `yarn build` (rebuilds with updated VoiceDashboardPage.jsx)
2. Verify `endedAt` field exists in Firestore callSessions
3. Check officeId matches in both dashboard and Firestore
4. Check browser DevTools → Network tab → verify API calls

### Issue: "CORS" errors on API calls
**Fix:** Backend CORS settings (check Cloud Run configuration):
```bash
gcloud run services update merxus-ai-backend \
  --region us-central1 \
  --set-cloudsql-instances="" \
  --update-env-vars ""
```

---

## Support

For Netlify-specific issues:
1. Check Netlify dashboard: https://app.netlify.com
2. Check deployment logs in Netlify console
3. Check frontend console: Browser DevTools → Console tab
4. Verify API routes: `curl https://backend-url/voice/analytics/payment-stats/test?days=30`

---

**Status:** ✅ Ready to Deploy to Netlify
