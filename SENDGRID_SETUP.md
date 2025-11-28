# SendGrid Email Setup Guide

This guide explains how to set up SendGrid for sending invitation emails.

## Why SendGrid?

SendGrid is a reliable email delivery service that integrates easily with Cloud Functions. It's free for up to 100 emails per day, which is perfect for development and small deployments.

## Step 1: Create SendGrid Account

1. Go to [SendGrid](https://sendgrid.com/)
2. Click **Start for Free**
3. Sign up for a free account (100 emails/day free tier)
4. Verify your email address

## Step 2: Create API Key

1. Log in to SendGrid
2. Go to **Settings** → **API Keys**
3. Click **Create API Key**
4. Name it: `Merxus Cloud Functions`
5. Select **Full Access** (or **Restricted Access** with Mail Send permissions)
6. Click **Create & View**
7. **Copy the API key immediately** - you won't be able to see it again!

## Step 3: Verify Sender Email

1. Go to **Settings** → **Sender Authentication**
2. Click **Verify a Single Sender**
3. Fill in the form:
   - **From Email Address**: `noreply@yourdomain.com` (or use a domain you own)
   - **From Name**: `Merxus`
   - **Reply To**: Your support email
   - **Company Address**: Your business address
4. Click **Create**
5. Check your email and click the verification link

**Note:** For production, you should use **Domain Authentication** instead of Single Sender. This requires DNS configuration.

## Step 4: Set Environment Variables

### Option A: Using Firebase Functions Config (Recommended)

```bash
cd web
firebase functions:config:set sendgrid.api_key="SG.your-api-key-here"
firebase functions:config:set sendgrid.from_email="noreply@yourdomain.com"
firebase functions:config:set frontend.url="https://yourdomain.com"
```

Then update the code to read from config:
```typescript
const sendGridApiKey = functions.config().sendgrid?.api_key;
const fromEmail = functions.config().sendgrid?.from_email;
const frontendUrl = functions.config().frontend?.url;
```

### Option B: Using .env file (Local Development)

Create `web/functions/.env`:
```env
SENDGRID_API_KEY=SG.your-api-key-here
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
FRONTEND_URL=http://localhost:3000
```

**Note:** `.env` files are for local development only. For production, use Firebase Functions config.

### Option C: Using Google Cloud Secret Manager (Most Secure)

1. Go to [Google Cloud Console - Secret Manager](https://console.cloud.google.com/security/secret-manager)
2. Create a secret named `sendgrid-api-key`
3. Store your SendGrid API key
4. Update your function to read from Secret Manager

## Step 5: Install SendGrid Package

The package is already added to `package.json`. Just install:

```bash
cd web/functions
npm install
```

## Step 6: Deploy Functions

```bash
cd web
firebase deploy --only functions
```

## Step 7: Test Email Sending

1. Create a new restaurant in the Merxus admin portal
2. The manager should receive an invitation email
3. Check SendGrid dashboard → **Activity** to see if emails were sent

## Troubleshooting

### Emails Not Sending

1. **Check SendGrid Dashboard:**
   - Go to **Activity** → Check for bounces, blocks, or errors
   - Check **Suppressions** → Make sure email isn't blocked

2. **Check Function Logs:**
   ```bash
   firebase functions:log
   ```
   Look for email-related errors

3. **Verify API Key:**
   - Make sure the API key is correct
   - Check that it has Mail Send permissions

4. **Check Sender Verification:**
   - Make sure your sender email is verified
   - For production, use Domain Authentication

### "Email not sent" Warning in Logs

This means SendGrid is not configured. The function will still work, but emails won't be sent. The invitation link will be logged to the console instead.

### Rate Limits

Free tier: 100 emails/day
- If you exceed this, emails will fail
- Upgrade to a paid plan for more emails

## Production Recommendations

1. **Use Domain Authentication** instead of Single Sender
2. **Set up SPF and DKIM records** in your DNS
3. **Monitor email deliverability** in SendGrid dashboard
4. **Set up webhooks** for bounce/spam reports
5. **Use Secret Manager** for API keys (not environment variables)

## Alternative: Use Firebase Extensions

Firebase has an official "Trigger Email" extension that can send emails:
- Go to Firebase Console → Extensions
- Install "Trigger Email"
- Configure it to send emails on Firestore document creation

This is simpler but less customizable than SendGrid.

## Email Templates

The current implementation uses HTML email templates. You can customize them in:
- `web/functions/src/utils/email.ts`

The templates include:
- Restaurant invitation (for new restaurant owners)
- Team invitation (for staff/manager invites)

## Testing Locally

For local testing, emails won't be sent unless you:
1. Set up `.env` file with SendGrid credentials
2. Run functions emulator with environment variables

Or you can test by checking the console logs for invitation links.

