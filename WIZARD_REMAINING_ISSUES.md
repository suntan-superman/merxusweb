# 🔧 Onboarding Wizard - Remaining Issues

## ✅ Fixed
- [x] Wizard saves tenant data at Step 5 (before testing at Step 6)
- [x] Twilio phone number saved to Firestore correctly
- [x] AI backend uses correct tenant (no more cross-tenant data)
- [x] Token refresh after tenant creation
- [x] "Add Listings" dialog shows CSV template download

---

## 🚧 Remaining Issues

### 1. **Listings Upload Not Functional** 📊
**Status:** UI only, no backend implementation

**Current Behavior:**
- "Add Listings" button opens modal with CSV template
- Template downloads correctly with sample data
- File upload shows toast message but doesn't actually upload

**Needed:**
- Backend API route to accept CSV upload
- Parse CSV and save to Firestore `agents/{agentId}/listings` collection
- Validation for required fields
- Error handling for malformed CSV

**Suggested Implementation:**
```typescript
// POST /api/estate/listings/import
// Body: FormData with CSV file
// Response: { success: true, imported: 10, errors: [] }
```

---

### 2. **Password Setup During Wizard** 🔐
**Status:** Not implemented

**Current Behavior:**
- User created with Firebase Auth
- Password reset email sent automatically
- User must click email link to set password

**User Request:**
- Allow password setup IN the wizard (Step 2 or Step 7)
- Send "welcome" email with password already set
- Optionally send reset link if they want to change it

**Suggested Implementation:**
- Add password field to Step 2 (Business Details)
- Use Firebase Auth `createUser()` with password parameter
- Skip password reset email if password provided
- Still send welcome/onboarding email with account details

---

### 3. **Merxus Admin Dashboard Not Tenant-Aware** 🏢
**Status:** Admin dashboard is restaurant-focused

**Current Behavior:**
- `/merxus` dashboard shows restaurant-specific widgets
- No way to switch between tenant types
- Real estate agents redirected here see irrelevant data

**User Request:**
- Make admin dashboard switch between tenant types
- OR create separate dashboards per tenant type
- Show relevant widgets based on user's primary tenant type

**Suggested Approaches:**

**Option A: Tenant Switcher**
- Add dropdown to switch between tenants if user has multiple
- Load dashboard widgets dynamically based on selected tenant
- Save preference to localStorage

**Option B: Unified Dashboard**
- Show aggregate stats across all tenants
- Tenant-type-specific sections (collapsible)
- "Quick Switch" buttons to go to specific tenant dashboards

**Option C: Smart Redirect (Simplest)**
- Check user's primary tenant type on login
- Redirect directly to `/estate/dashboard`, `/restaurant/dashboard`, or `/voice/dashboard`
- Only show `/merxus` to true super_admins

---

### 4. **403 Error on Analytics Endpoint** ⚠️
**Status:** Backend permission issue

**Error:**
```
GET /api/merxus/analytics 403 (Forbidden)
```

**Cause:**
- Endpoint requires `super_admin` or `merxus_admin` role
- New users don't have this role by default

**Fix Needed:**
- Update `/api/merxus/analytics` to allow tenant-specific analytics
- OR create separate endpoint `/api/estate/analytics` for real estate agents
- OR skip loading Merxus analytics if user is not merxus_admin

---

## 📝 Additional Enhancements

### Nice-to-Have Features

1. **Wizard Progress Persistence**
   - Save progress to localStorage
   - Allow user to resume if they close browser
   - "Resume Setup" button if incomplete wizard detected

2. **More Robust Error Handling**
   - Retry logic for Twilio API failures
   - Better error messages for user
   - Rollback mechanism if tenant creation fails mid-process

3. **Onboarding Email Template**
   - Branded HTML email with:
     - Welcome message
     - Phone number confirmation
     - Quick start guide link
     - Support contact info

4. **Skip Options**
   - Allow skipping Twilio setup (configure later)
   - Allow skipping voice selection (use default)
   - "Set up later" links for non-critical steps

---

## 🎯 Priority Order

1. **HIGH:** Fix auth/redirect after wizard completion ✅ (DONE)
2. **MEDIUM:** Password setup in wizard (improves UX significantly)
3. **MEDIUM:** Dashboard tenant awareness (very confusing for non-restaurant users)
4. **LOW:** Listings upload implementation (can be done in dashboard later)
5. **LOW:** Nice-to-have enhancements

---

## 📞 Support

For questions or issues, contact the development team or check:
- Firebase Functions logs: `firebase functions:log`
- Cloud Run logs: `gcloud logging read "resource.type=cloud_run_revision"`
