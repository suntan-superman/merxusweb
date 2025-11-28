# Setup Scripts

## setup-test-users.js

Interactive script to create test users with proper custom claims.

### Prerequisites

1. Firebase CLI installed: `npm install -g firebase-tools`
2. Logged in: `firebase login`
3. Or have a service account key file

### Prerequisites

Install firebase-admin as a dev dependency:
```bash
cd web
yarn add -D firebase-admin
```

### Usage

```bash
cd web
node scripts/setup-test-users.mjs
```

The script will guide you through:
- Creating restaurant users (owner/manager/staff)
- Creating Merxus admin users
- Setting proper custom claims
- Creating Firestore user documents

### Example Session

```
Merxus Test User Setup Script

Choose an option:
1. Create Restaurant User
2. Create Merxus Admin
3. Exit
Choice: 1

=== Setting up Restaurant User ===
Email: owner@test.com
Password: password123
Role (owner/manager/staff): owner
Restaurant ID: test-restaurant-1
Display Name (optional): Test Owner

✅ Successfully set up user: owner@test.com
   Role: owner
   Restaurant ID: test-restaurant-1
   UID: abc123xyz
```

