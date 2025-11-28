# Firebase Project Setup

## Quick Setup Steps

### Step 1: List Your Firebase Projects

First, see what projects you have access to:

```bash
firebase projects:list
```

This will show all Firebase projects you can access.

### Step 2: Set Active Project

Choose one of these methods:

#### Method A: Use Existing Project (Recommended)

```bash
cd web
firebase use --add
```

This will:
1. Show you a list of your Firebase projects
2. Let you select one
3. Ask for an alias (you can just press Enter for "default")
4. Create a `.firebaserc` file with your project configuration

#### Method B: Specify Project Directly

```bash
cd web
firebase use your-project-id
```

Replace `your-project-id` with your actual Firebase project ID.

### Step 3: Verify Project is Set

```bash
firebase use
```

This will show your currently active project.

### Step 4: Deploy Functions

Now you can deploy:

```bash
firebase deploy --only functions
```

## If You Don't Have a Firebase Project Yet

1. **Create a project in Firebase Console:**
   - Go to https://console.firebase.google.com/
   - Click "Add project" or "Create a project"
   - Follow the setup wizard

2. **Then initialize Firebase in your project:**
   ```bash
   cd web
   firebase init
   ```
   
   When prompted:
   - Select: **Firestore**, **Functions**, **Hosting** (optional)
   - Choose "Use an existing project"
   - Select your newly created project
   - For Functions: Choose TypeScript, ESLint (optional), install dependencies

3. **This will create `.firebaserc` automatically**

## Troubleshooting

### "No currently active project"
- Run `firebase use --add` to set a project
- Or use `firebase use <project-id>` to set it directly

### "Project not found"
- Make sure you're logged in: `firebase login`
- Check you have access to the project in Firebase Console
- Verify the project ID is correct

### "Permission denied"
- Make sure you're the owner or have Editor role on the project
- Check Firebase Console → Project Settings → Users and permissions

## Quick Reference

```bash
# List projects
firebase projects:list

# Set active project (interactive)
firebase use --add

# Set active project (direct)
firebase use your-project-id

# Show current project
firebase use

# Deploy functions
firebase deploy --only functions

# Deploy everything
firebase deploy
```

