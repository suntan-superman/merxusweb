# 🧪 Test Wizard Now - Complete Flow

## ✅ All 3 Features Deployed

### **Deployed:**
- ✅ Firebase Functions (with password support)
- ✅ Web app (with all 3 features)

---

## 🎯 Complete Test Flow

### **Step-by-Step Testing:**

1. **Navigate to Wizard**
   ```
   http://localhost:5173/merxus/setup-wizard
   ```

2. **Step 1: Industry Selection**
   - Select "Real Estate"
   - Click "Continue"

3. **Step 2: Business Details** ⭐ NEW PASSWORD FIELD
   - Business Name: `Apple Real Estate`
   - Your Name: `Apple Tester`
   - Email: `tester@merxusllc.com` (use a different email if you want)
   - **Temporary Password:** `Test123!` ⭐ **NEW!**
   - Phone: `6613451154`
   - Address: `8612 Mainsail Drive`
   - City: `Bakersfield`
   - State: `CA`
   - Zip: `93312`
   - Click "Continue"

4. **Step 3: Twilio Setup**
   - Should see unassigned numbers from Twilio
   - Click "✓ Use This" on one of them
   - Click "Continue"

5. **Step 4: Voice Selection**
   - Select any voice (e.g., "Alloy")
   - Click "Continue"

6. **Step 5: Industry Settings**
   - Brand Name: `Apple Real Estate Team`
   - Brokerage: `Century 21`
   - License: `CA-DRE-123456`
   - Markets: `Bakersfield, Kern County`
   - Click "Continue"
   - **Watch for:** `✅ Setup saved! You can now test your AI at the next step.`

7. **Step 6: Test AI**
   - Call the Twilio number
   - AI should respond with branded greeting: "Thank you for calling Apple Real Estate..."
   - Ask questions, AI should respond properly
   - Hang up
   - Click "Continue"

8. **Step 7: Completion** ⭐ NEW LISTINGS UPLOAD
   - Click "Add your listings" button ⭐ **NEW!**
   - Modal opens with CSV import dialog
   - Click "Download Template" to get sample CSV
   - Open template, add more listings if you want
   - Click "Choose File" and select your CSV
   - Should see preview: "Preview (X listings found)"
   - Click "Import Listings"
   - **Watch for:** Green progress bar animating ⭐ **NEW!**
     ```
     Importing Listings... 2 of 2          100%
     ████████████████████████████████████████
     Processing listing 2 of 2...
     ```
   - Success message: `Successfully imported 2 listings`
   - Modal closes after 2 seconds
   - Click "Go to Dashboard →"

9. **After Wizard** ⭐ NEW AUTO-REDIRECT
   - Should see: "🎉 Setup completed! Refreshing your access..."
   - Brief delay (1 second)
   - **Should redirect to `/estate/dashboard`** ⭐ **NEW!**
   - **Should NOT redirect to `/merxus`** (restaurant dashboard)
   - Estate dashboard should load with your listings visible

10. **Test Login with New Password** ⭐ NEW
    - Logout
    - Login with:
      - Email: `tester@merxusllc.com`
      - Password: `Test123!` (the one you set in Step 2)
    - Should login successfully ✅
    - Should land on `/estate/dashboard`

---

## 🎬 Visual Indicators to Watch For

### Step 2 (Password)
```
┌──────────────────────────────────────┐
│ 🔒 Temporary Password *              │
│ ┌──────────────────────────────────┐ │
│ │ ••••••••                         │ │
│ └──────────────────────────────────┘ │
│ This is a temporary password.        │
│ You can reset it by clicking the     │
│ link in your invitation email.       │
└──────────────────────────────────────┘
```

### Step 5 → Step 6 (Save Confirmation)
```
✅ Setup saved! You can now test your AI at the next step.
```

### Step 7 (Listings Upload Progress)
```
┌─────────────────────────────────────────────┐
│ Importing Listings... 15 of 50        30% │
│ ███████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ Processing listing 15 of 50...             │
└─────────────────────────────────────────────┘
```

### Step 7 → Dashboard (Redirect)
```
🎉 Setup completed! Refreshing your access...
[1 second delay]
→ Redirects to /estate/dashboard
```

---

## 📋 Expected Results

### After Completing Wizard:

**Firestore Database:**
```
agents/
  └── agent_[timestamp]_[id]/
      └── meta/
          └── settings
              ├── agentId: "agent_..."
              ├── name: "Apple Tester"
              ├── brandName: "Apple Real Estate Team"
              ├── email: "tester@merxusllc.com"
              ├── twilioPhoneNumber: "+16614664298"
              ├── twilioNumberSid: "PN..."
              ├── twilioAccountSid: "auto_provisioned"
              ├── twilioAuthToken: "auto_provisioned"
              ├── aiVoice: "alloy"
              ├── brokerage: "Century 21"
              ├── licenseNumber: "CA-DRE-123456"
              └── markets: ["Bakersfield", "Kern County"]
      └── listings/
          ├── listing_[id_1]
          │   ├── address: "123 Main St"
          │   ├── city: "Bakersfield"
          │   ├── price: 450000
          │   └── ...
          └── listing_[id_2]
              └── ...
```

**Firebase Auth:**
```
Users/
  └── [uid]
      ├── email: "tester@merxusllc.com"
      ├── displayName: "Apple Tester"
      ├── emailVerified: false
      └── customClaims:
          ├── role: "owner"
          ├── agentId: "agent_..."
          ├── tenantId: "agent_..."
          └── type: "real_estate"
```

**Emails Sent:**
1. **Invitation Email** (to user)
   - Subject: "Welcome to Merxus - Set Your Password"
   - Contains password reset link
   - User can click to change password if desired

2. **Sales Notification** (to sales@merxusllc.com)
   - Subject: "🎉 New 🏡 Real Estate Signup - Apple Real Estate"
   - Contains all tenant details

---

## 🚨 Troubleshooting

### Issue: "Continue" button disabled at Step 2
**Cause:** Password not entered or less than 6 characters
**Fix:** Enter password with at least 6 characters

### Issue: Can't login with temporary password
**Cause:** Password not saved during user creation
**Fix:** Check Firebase Auth console → Users → [email] → "Reset Password"

### Issue: Redirected to `/merxus` instead of `/estate/dashboard`
**Cause:** Token not refreshed, claims not updated
**Fix:** 
1. Check browser console for "✅ Token refreshed"
2. Wait 1-2 seconds after "Setup completed" message
3. Hard refresh browser (Ctrl+Shift+R)

### Issue: Listings not importing / progress stuck
**Cause:** Network error or API permission issue
**Fix:**
1. Check browser console for errors
2. Check Firebase Functions logs: `firebase functions:log`
3. Verify user has permission to create listings (owner role)

### Issue: Progress bar shows 0% the whole time
**Cause:** State update batching or rendering issue
**Fix:** This is cosmetic - listings are still importing, just progress not displaying

---

## 🎉 Success Criteria

✅ Wizard completes without errors
✅ Password field visible and validated at Step 2
✅ User can login with temporary password
✅ Listings upload shows progress bar
✅ Listings appear in dashboard after import
✅ User redirected to correct tenant dashboard
✅ AI responds correctly with tenant-specific info

---

## 📞 What to Share

After testing, let me know:
1. ✅/❌ Did password setup work? (could you login?)
2. ✅/❌ Did listings upload show progress bar?
3. ✅/❌ How many listings imported successfully?
4. ✅/❌ Did you land on estate dashboard (not merxus)?
5. 🎙️ What did the AI say when you called?
6. 🐛 Any errors in console?
