# Viewing Firebase Functions Logs

## Method 1: Firebase CLI (Recommended)

### View Recent Logs
```bash
# Navigate to the functions directory
cd web/functions

# View recent log entries (default shows last 50)
firebase functions:log

# View logs in real-time (streaming)
firebase functions:log --follow

# Filter logs by function name
firebase functions:log --only api

# Filter logs by text search (PowerShell)
firebase functions:log | Select-String "SendGrid"

# Filter logs by text search (Bash/Linux/Mac)
firebase functions:log | grep "SendGrid"
```

### View Logs for Specific Function
```bash
# View logs for the api function
firebase functions:log --only api

# View logs for a specific endpoint
firebase functions:log | grep "onboarding"
```

## Method 2: Firebase Console (Web UI)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **merxus-f0872**
3. Navigate to **Functions** in the left sidebar
4. Click on the **`api`** function
5. Click on the **Logs** tab
6. You'll see all function execution logs with timestamps

### Filter Logs in Console
- Use the search box to filter by text (e.g., "SendGrid", "onboarding")
- Use the time range selector to view logs from specific periods
- Click on individual log entries to see full details

## Method 3: Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **merxus-f0872**
3. Navigate to **Cloud Functions** (or search for it)
4. Click on **`api`** function
5. Click on **Logs** tab
6. Use filters to search for specific log entries

## What to Look For

After creating a company, look for log entries containing:

### SendGrid Configuration Check
```
[Onboarding] SendGrid config check: {
  hasFunctionsConfig: true/false,
  hasEnvVar: true/false,
  apiKeyLength: 0-100,
  apiKeyPrefix: "SG." or "none"
}
```

### Office Creation Logs
```
Creating office with payload: ...
Office created successfully
Invitation email sent via SendGrid to ...
```

### Error Messages
```
SendGrid API key not configured
SendGrid send failed
Error sending email
```

## Local Development

If you're running Firebase emulators locally:

```bash
# Start emulators
cd web
firebase emulators:start

# Logs will appear in the terminal where emulators are running
# Look for console.log statements in your function code
```

## Quick Commands Reference

```bash
# View last 50 logs
firebase functions:log

# View last 100 logs
firebase functions:log --limit 100

# Stream logs in real-time
firebase functions:log --follow

# Search for SendGrid logs
firebase functions:log | grep -i sendgrid

# Search for onboarding logs
firebase functions:log | grep -i onboarding

# View logs from last hour (requires gcloud CLI)
gcloud functions logs read api --limit 50 --project merxus-f0872
```

## Troubleshooting

### If logs don't show up:
1. Make sure you're logged in: `firebase login`
2. Make sure you're in the correct project: `firebase use merxus-f0872`
3. Check that functions are deployed: `firebase functions:list`
4. Wait a few seconds after triggering the function (logs may be delayed)

### If you see "SendGrid API key not configured":
1. Check Firebase Functions config: `firebase functions:config:get`
2. Set the config if missing: `firebase functions:config:set sendgrid.api_key="YOUR_KEY"`
3. Redeploy functions: `firebase deploy --only functions`

