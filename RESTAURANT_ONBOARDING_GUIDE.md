# Restaurant Onboarding Guide

This guide explains how to add a new restaurant to the Merxus portal and set up the initial manager/owner account.

## Overview

The onboarding process follows these steps:

1. **Merxus Admin creates restaurant** - Sets up restaurant profile and initial manager
2. **Manager receives invitation** - Email with password setup link
3. **Manager logs in** - Sets password and accesses restaurant portal
4. **Manager manages team** - Can invite additional team members

---

## Step 1: Create Restaurant (Merxus Admin)

### Via Admin Portal

1. **Login as Merxus Admin**
   - Go to `/merxus` dashboard
   - You must have `merxus_admin` or `merxus_support` role

2. **Navigate to Create Restaurant**
   - Click "Create Restaurant" on dashboard, OR
   - Go to `/merxus/restaurants` and click "+ Create Restaurant"

3. **Fill in Restaurant Information**
   - Restaurant Name (required)
   - Contact Email (required)
   - Phone Number (required, E.164 format: +15551234567)
   - Address (optional)
   - Timezone (required)

4. **Create Initial Manager/Owner**
   - Manager Email (required)
   - Manager Full Name (required)
   - Role: Automatically set to "owner"

5. **Submit**
   - System creates:
     - Restaurant document in Firestore
     - Settings document with default business hours
     - Manager user account with custom claims
     - Password reset link for invitation email

### What Gets Created

**Firestore Structure:**
```
restaurants/
  {restaurantId}/
    - email: contact email
    - createdAt: timestamp
    - disabled: false
    
    meta/
      settings/
        - restaurantId
        - name
        - email
        - phoneNumber
        - address
        - timezone
        - businessHours (default: 11am-9pm all days)
        - notifySmsNumbers: []
        - notifyEmailAddresses: [contact email]
    
    users/
      {managerUid}/
        - uid
        - email
        - displayName
        - role: "owner"
        - invitedAt: timestamp
        - disabled: false
```

**Firebase Auth:**
- User account created with manager email
- Custom claims set:
  - `role: "owner"`
  - `restaurantId: "{restaurantId}"`
  - `type: "restaurant"`

---

## Step 2: Manager Receives Invitation

### Email Invitation (TODO: Integrate SendGrid)

Currently, the invitation link is logged to the console. To send emails:

1. **Set up SendGrid** (or another email service)
2. **Add email template** for restaurant invitations
3. **Update Cloud Function** to send email with password reset link

**Invitation Link Format:**
```
https://yourdomain.com/login?fromInvite=true&restaurantId={restaurantId}
```

**Email Content Should Include:**
- Welcome message
- Restaurant name
- Password setup link (from Firebase Auth)
- Instructions for first login

---

## Step 3: Manager First Login

1. **Manager clicks invitation link**
   - Redirected to login page with `fromInvite=true` parameter
   - Sees welcome message

2. **Sets password**
   - Uses "Forgot Password" flow
   - Or direct password reset link from email

3. **Logs in**
   - Enters email and new password
   - Redirected to `/restaurant` dashboard

4. **Accesses restaurant portal**
   - Can now manage:
     - Orders
     - Calls & Messages
     - Customers
     - Menu
     - Settings
     - Team members (as owner)

---

## Step 4: Manager Manages Team

The owner/manager can now invite additional team members:

1. **Go to Team & Access** (`/restaurant/users`)
2. **Invite User**
   - Enter email and name
   - Select role (manager or staff)
3. **User receives invitation**
   - Email with password setup link
   - Sets password and logs in
   - Gets appropriate role-based access

---

## API Endpoints

### Create Restaurant
```
POST /api/merxus/restaurants
Authorization: Bearer <merxus-admin-token>

Body:
{
  "restaurant": {
    "name": "Joe's Pizza",
    "email": "contact@joespizza.com",
    "phoneNumber": "+15551234567",
    "address": "123 Main St, City, State ZIP",
    "timezone": "America/Los_Angeles"
  },
  "manager": {
    "email": "manager@joespizza.com",
    "displayName": "John Doe",
    "role": "owner"
  }
}

Response:
{
  "restaurantId": "rest_1234567890_abc123",
  "message": "Restaurant created successfully",
  "invitationLink": "https://..." // For testing
}
```

---

## Manual Setup (Alternative)

If you prefer to set up restaurants manually:

### 1. Create Restaurant Document

```javascript
// In Firebase Console or via script
const restaurantId = 'rest_1234567890';
await db.collection('restaurants').doc(restaurantId).set({
  email: 'contact@restaurant.com',
  createdAt: new Date(),
  disabled: false,
});
```

### 2. Create Settings

```javascript
await db
  .collection('restaurants')
  .doc(restaurantId)
  .collection('meta')
  .doc('settings')
  .set({
    restaurantId,
    name: 'Restaurant Name',
    email: 'contact@restaurant.com',
    phoneNumber: '+15551234567',
    timezone: 'America/Los_Angeles',
    businessHours: { /* ... */ },
  });
```

### 3. Create Manager User

Use the setup script:
```bash
node scripts/setup-test-users.mjs
```

Or via Cloud Function:
```javascript
// Create user
const user = await admin.auth().createUser({
  email: 'manager@restaurant.com',
  displayName: 'Manager Name',
});

// Set claims
await admin.auth().setCustomUserClaims(user.uid, {
  role: 'owner',
  restaurantId: restaurantId,
  type: 'restaurant',
});

// Create Firestore user doc
await db
  .collection('restaurants')
  .doc(restaurantId)
  .collection('users')
  .doc(user.uid)
  .set({
    uid: user.uid,
    email: user.email,
    displayName: 'Manager Name',
    role: 'owner',
    invitedAt: new Date(),
    disabled: false,
  });
```

---

## Troubleshooting

### Manager can't log in
- Check that custom claims are set correctly
- Verify user account exists in Firebase Auth
- Check that user has `restaurantId` in claims
- User may need to sign out and sign back in to refresh token

### Restaurant not showing in admin portal
- Verify restaurant document exists in Firestore
- Check that settings document exists
- Ensure restaurant is not disabled

### Invitation email not sent
- Currently emails are logged to console
- Integrate SendGrid or email service
- Check Cloud Function logs for errors

---

## Next Steps

1. **Integrate Email Service** - Set up SendGrid for invitation emails
2. **Add Onboarding Wizard** - Guide new managers through initial setup
3. **Add Restaurant Templates** - Pre-configure common settings
4. **Add Bulk Import** - Import multiple restaurants at once

---

## Security Notes

- Only Merxus admins can create restaurants
- Manager accounts are created with `owner` role by default
- Custom claims ensure proper access control
- Firestore security rules enforce multi-tenant isolation
- Password reset links expire after use

