# Firebase CLI Troubleshooting

## Issue: "Invalid project selection" or "Project doesn't exist"

Even if you can see the project in Firebase Console, the CLI might not have access. Here's how to fix it:

## Solution 1: Verify You're Logged In

```bash
firebase login
```

This will:
- Open a browser for authentication
- Verify your login status
- Refresh your access tokens

## Solution 2: Check Your Projects List

```bash
firebase projects:list
```

This shows all projects your CLI account has access to. If `merxus-f0872` doesn't appear:
- You might be logged in with a different account
- You might not have the right permissions on the project

## Solution 3: Check Project Permissions

In Firebase Console:
1. Go to Project Settings (gear icon)
2. Click "Users and permissions" tab
3. Make sure your account has at least "Editor" role

## Solution 4: Try Logging Out and Back In

```bash
firebase logout
firebase login
```

Then try again:
```bash
firebase use merxus-f0872
```

## Solution 5: Use Firebase Init Instead

If `firebase use` doesn't work, try initializing:

```bash
cd web
firebase init
```

When prompted:
- Select: **Functions**, **Firestore**, **Hosting** (optional)
- Choose: **Use an existing project**
- Select: **merxus-f0872** from the list

This will create the `.firebaserc` file automatically.

## Solution 6: Manually Create .firebaserc

If all else fails, you can manually create the file:

Create `web/.firebaserc`:
```json
{
  "projects": {
    "default": "merxus-f0872"
  }
}
```

Then verify:
```bash
firebase use
```

## Verify It Works

After setting the project, verify:
```bash
firebase use
```

Should show: `Active Project: merxus-f0872 (default)`

Then try deploying:
```bash
firebase deploy --only functions
```

