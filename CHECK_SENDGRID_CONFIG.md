# Checking SendGrid Configuration

## Quick Check Commands

### 1. Check Firebase Functions Config
```bash
cd web
firebase functions:config:get
```

Look for:
```
sendgrid:
  api_key: "SG.xxxxx"
  from_email: "noreply@yourdomain.com"
```

### 2. Check Current Config Values
```bash
cd web
firebase functions:config:get sendgrid
```

## Setting Up SendGrid (If Not Configured)

### Step 1: Get Your SendGrid API Key

1. Go to https://app.sendgrid.com/
2. Navigate to **Settings** → **API Keys**
3. If you don't have one, click **"Create API Key"**
   - Name: `Merxus Production`
   - Permissions: **Full Access** (or **Restricted Access** with Mail Send)
   - Copy the key (starts with `SG.`)

### Step 2: Verify Sender Email

1. In SendGrid, go to **Settings** → **Sender Authentication**
2. Click **"Verify a Single Sender"** (or use Domain Authentication for production)
3. Enter your email and verify it

### Step 3: Set Firebase Functions Config

```bash
cd web

# Set SendGrid API key
firebase functions:config:set sendgrid.api_key="SG.your-actual-api-key-here"

# Set sender email (must match verified email in SendGrid)
firebase functions:config:set sendgrid.from_email="noreply@yourdomain.com"

# Optional: Set template IDs if using SendGrid Dynamic Templates
firebase functions:config:set sendgrid.template_office_invitation="d-xxxxx"
firebase functions:config:set sendgrid.template_restaurant_invitation="d-xxxxx"
```

**Important:** Replace:
- `SG.your-actual-api-key-here` with your real API key
- `noreply@yourdomain.com` with your verified sender email
- `d-xxxxx` with your SendGrid template IDs (if using templates)

### Step 4: Deploy Functions

After setting config, redeploy functions:

```bash
cd web
firebase deploy --only functions
```

### Step 5: Test and Check Logs

1. Create a new company through onboarding
2. Check logs:

```bash
cd web/functions
firebase functions:log --only api | Select-String "SendGrid"
```

Look for:
- ✅ `[Onboarding] SendGrid config check: { hasFunctionsConfig: true, ... }`
- ✅ `Email sent successfully to: ...`
- ❌ `SendGrid API key not configured` (means config not set)
- ❌ `SendGrid send failed` (means API key invalid or sender not verified)

## Troubleshooting

### Issue: "hasFunctionsConfig: false"

**Solution:** Config not set. Run:
```bash
firebase functions:config:set sendgrid.api_key="SG.your-key"
firebase deploy --only functions
```

### Issue: "SendGrid send failed"

**Possible causes:**
1. **API key invalid** - Check it starts with `SG.` and is correct
2. **Sender email not verified** - Verify email in SendGrid dashboard
3. **Rate limit** - Free tier: 100 emails/day
4. **Template ID wrong** - If using templates, check template IDs

**Check SendGrid Activity:**
1. Go to https://app.sendgrid.com/
2. Navigate to **Activity**
3. Look for failed sends and error messages

### Issue: Config shows but emails still fail

1. **Verify sender email is verified** in SendGrid
2. **Check API key permissions** - needs "Mail Send" permission
3. **Check SendGrid Activity** for specific error messages
4. **Test API key directly:**
   ```bash
   # Test with curl (replace with your values)
   curl -X POST https://api.sendgrid.com/v3/mail/send \
     -H "Authorization: Bearer SG.your-api-key" \
     -H "Content-Type: application/json" \
     -d '{"personalizations":[{"to":[{"email":"test@example.com"}]}],"from":{"email":"noreply@yourdomain.com"},"subject":"Test","content":[{"type":"text/plain","value":"Test email"}]}'
   ```

## Viewing Current Config

```bash
# View all config
firebase functions:config:get

# View only SendGrid config
firebase functions:config:get sendgrid

# View specific value
firebase functions:config:get sendgrid.api_key
```

## Removing Config (If Needed)

```bash
firebase functions:config:unset sendgrid.api_key
firebase functions:config:unset sendgrid.from_email
firebase deploy --only functions
```

## Next Steps After Setup

Once SendGrid is working:
1. Check SendGrid Activity dashboard to see sent emails
2. Customize email templates in `web/functions/src/utils/email.ts`
3. Set up SendGrid Dynamic Templates for branded emails (optional)
4. Monitor email delivery rates in SendGrid dashboard

