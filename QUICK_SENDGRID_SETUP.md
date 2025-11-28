# Quick SendGrid Setup Guide

## Step-by-Step Setup (5 minutes)

### 1. Create SendGrid Account
1. Go to https://sendgrid.com/
2. Click **"Start for Free"**
3. Sign up (free tier: 100 emails/day is plenty for development)

### 2. Create API Key
1. Log in to SendGrid
2. Go to **Settings** → **API Keys** (left sidebar)
3. Click **"Create API Key"** button
4. Name it: `Merxus Cloud Functions`
5. Select **"Full Access"** (or **"Restricted Access"** with Mail Send permission)
6. Click **"Create & View"**
7. **IMPORTANT:** Copy the API key immediately (starts with `SG.`) - you won't see it again!

### 3. Verify Sender Email
1. Go to **Settings** → **Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Fill in:
   - **From Email Address**: Your email (e.g., `noreply@yourdomain.com` or your personal email)
   - **From Name**: `Merxus`
   - **Reply To**: Your support email
   - **Company Address**: Your business address
4. Click **"Create"**
5. Check your email and click the verification link

### 4. Configure Firebase Functions

**Option A: Using Firebase Functions Config (Recommended for Production)**

```bash
cd web
firebase functions:config:set sendgrid.api_key="SG.your-api-key-here"
firebase functions:config:set sendgrid.from_email="noreply@yourdomain.com"
firebase functions:config:set frontend.url="https://yourdomain.com"
```

Replace:
- `SG.your-api-key-here` with your actual SendGrid API key
- `noreply@yourdomain.com` with the email you verified in SendGrid
- `https://yourdomain.com` with your frontend URL (or `http://localhost:3000` for local dev)

**Option B: Using .env file (For Local Development)**

Create `web/functions/.env`:
```env
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=http://localhost:3000
```

### 5. Install SendGrid Package

```bash
cd web/functions
npm install
```

### 6. Deploy Functions

```bash
cd web
firebase deploy --only functions
```

### 7. Test It!

1. Create a new restaurant in the Merxus admin portal
2. The manager should receive a beautiful invitation email!
3. Check SendGrid dashboard → **Activity** to see if emails were sent

## Verify It's Working

After deploying, check the function logs:
```bash
firebase functions:log
```

Look for:
- ✅ `Email sent successfully to: manager@example.com`
- ❌ `SendGrid API key not configured` (means config didn't work)

## Troubleshooting

### "Email not sent" in logs
- Check that API key is correct (starts with `SG.`)
- Verify sender email is verified in SendGrid
- Check SendGrid dashboard → Activity for errors

### Emails going to spam
- Verify your sender email/domain in SendGrid
- For production, use Domain Authentication (requires DNS setup)

### Rate limit errors
- Free tier: 100 emails/day
- Upgrade SendGrid plan if needed

## Next Steps

Once working, you can:
- Customize email templates in `web/functions/src/utils/email.ts`
- Add your logo/branding
- Track email opens/clicks in SendGrid dashboard

## That's It!

You're all set! Invitation emails will now be sent automatically with custom branding. 🎉

