# Voice Selection Debugging - Full Trace

## Issue
User selects a voice (e.g., "echo" or "fable") but Firestore shows "alloy"

## Logging Added

I've added comprehensive logging throughout the **entire** voice selection flow:

### 1. Frontend - VoiceSelection Component
**File:** `src/components/onboarding/steps/VoiceSelection.jsx`

```javascript
onClick={() => {
  console.log('🎤 [VoiceSelection] User clicked voice:', voice.id, voice.name);
  onSelect(voice.id);
}}
```

**What to look for:**
- When you click a voice, you should see: `🎤 [VoiceSelection] User clicked voice: echo Echo`
- This confirms the click handler fired and which voice was clicked

---

### 2. Frontend - OnboardingWizard State Update
**File:** `src/components/onboarding/OnboardingWizard.jsx`

```javascript
const updateWizardData = (updates) => {
  if (updates.aiVoice) {
    console.log('🎤 [OnboardingWizard] updateWizardData called with aiVoice:', updates.aiVoice);
  }
  setWizardData((prev) => {
    const newData = { ...prev, ...updates };
    if (updates.aiVoice) {
      console.log('🎤 [OnboardingWizard] New wizardData.aiVoice:', newData.aiVoice);
    }
    return newData;
  });
};
```

**What to look for:**
- After clicking, you should see:
  ```
  🎤 [OnboardingWizard] updateWizardData called with aiVoice: echo
  🎤 [OnboardingWizard] New wizardData.aiVoice: echo
  ```
- This confirms the state was updated in the wizard

---

### 3. Frontend - Payload Creation
**File:** `src/pages/merxus/SetupWizardPage.jsx`

```javascript
console.log('🎤 [SetupWizardPage] BEFORE creating payload:');
console.log('  wizardData.aiVoice:', wizardData.aiVoice);

payload = {
  agent: {
    // ... other fields
    aiVoice: wizardData.aiVoice || 'alloy',
  }
};

console.log('🎤 [SetupWizardPage] AFTER creating payload:');
console.log('  payload.agent.aiVoice:', payload.agent.aiVoice);
```

**What to look for:**
- When submitting at Step 5 (or Step 7), you should see:
  ```
  🎤 [SetupWizardPage] BEFORE creating payload:
    wizardData.aiVoice: echo
  🎤 [SetupWizardPage] AFTER creating payload:
    payload.agent.aiVoice: echo
  ```
- This confirms the payload being sent to backend has the correct voice

---

### 4. Backend - Request Received
**File:** `functions/src/routes/onboarding.ts` (createAgent function)

```javascript
console.log('🎤 [createAgent] Request received');
console.log('🎤 [createAgent] agent.aiVoice from request:', agent.aiVoice);
```

**What to look for (in Firebase Functions logs):**
- When backend receives the request:
  ```
  🎤 [createAgent] Request received
  🎤 [createAgent] agent.aiVoice from request: echo
  ```
- This confirms the backend received the correct voice

---

### 5. Backend - Writing to Firestore
**File:** `functions/src/routes/onboarding.ts` (createAgent function)

```javascript
aiConfig: (() => {
  const voiceName = agent.aiVoice || 'alloy';
  console.log('🎤 [createAgent] Setting aiConfig.voiceName to:', voiceName);
  return {
    model: 'gpt-4o-mini',
    voiceName: voiceName,
    // ... rest of config
  };
})(),
```

**What to look for (in Firebase Functions logs):**
- Right before writing to Firestore:
  ```
  🎤 [createAgent] Setting aiConfig.voiceName to: echo
  ```
- This confirms what value is being written to Firestore

---

## Testing Instructions

### Step-by-Step Test:

1. **Open Browser Dev Tools** (F12)
2. **Go to Console Tab**
3. **Clear Console** (Ctrl+L or Clear button)
4. **Start Wizard** as super_admin
5. **Go through Steps 1-3** (Industry, Business Details, Twilio)
6. **At Step 4 (Voice Selection):**
   - Click on a voice OTHER than "Alloy" (e.g., "Echo" or "Fable")
   - **CHECK CONSOLE** - Should see:
     ```
     🎤 [VoiceSelection] User clicked voice: echo Echo
     🎤 [OnboardingWizard] updateWizardData called with aiVoice: echo
     🎤 [OnboardingWizard] New wizardData.aiVoice: echo
     ```
   - ✅ If you see this, voice selection in UI is working
   - ❌ If you DON'T see this, there's a problem with the click handler or state update

7. **Continue to Step 5** (Real Estate Settings)
   - Fill in any required fields
   - Click "Continue"
   - **CHECK CONSOLE** - Should see:
     ```
     🎤 [SetupWizardPage] BEFORE creating payload:
       wizardData.aiVoice: echo
     🎤 [SetupWizardPage] AFTER creating payload:
       payload.agent.aiVoice: echo
     ```
   - ✅ If you see this, frontend is sending correct voice
   - ❌ If you see "alloy" here, the state got reset somehow

8. **Continue to Step 6 and 7**
   - Complete the wizard

9. **Check Backend Logs:**
   - Open Firebase Console
   - Go to Functions → Logs
   - Filter for logs containing "🎤"
   - Should see:
     ```
     🎤 [createAgent] Request received
     🎤 [createAgent] agent.aiVoice from request: echo
     🎤 [createAgent] Setting aiConfig.voiceName to: echo
     ```
   - ✅ If you see this, backend received and saved correct voice
   - ❌ If you see "alloy", something went wrong in transmission

10. **Check Firestore:**
    - Open Firebase Console
    - Go to Firestore Database
    - Navigate to: `agents/{agentId}/aiConfig`
    - Check `voiceName` field
    - Should be: `"echo"` (or whatever you selected)
    - ✅ If correct, issue is SOLVED
    - ❌ If "alloy", check backend logs for what actually got saved

---

## Possible Issues & Solutions

### Issue 1: Console shows correct voice, but backend logs show "alloy"
**Root Cause:** State got reset between Step 4 and Step 5/7
**Solution:** Check if there's any code that reinitializes `wizardData`

### Issue 2: Console shows "alloy" immediately after clicking
**Root Cause:** `onSelect` callback not wired correctly
**Solution:** Check OnboardingWizard.jsx line 264:
```javascript
{currentStep === 4 && (
  <VoiceSelection
    selectedVoice={wizardData.aiVoice}
    onSelect={(voice) => updateWizardData({ aiVoice: voice })}
    tenantType={wizardData.tenantType}
  />
)}
```

### Issue 3: Backend logs show correct voice, but Firestore shows "alloy"
**Root Cause:** Firestore write failed or was overwritten
**Solution:** Check for any code that writes to `aiConfig` after initial creation

### Issue 4: No logs appear at all
**Root Cause:** 
- Frontend: Dev server not restarted
- Backend: Functions not deployed
**Solution:**
- Frontend: `yarn start` (restart dev server)
- Backend: `firebase deploy --only functions` (already done)

---

## Expected Flow (Success Case)

```
User clicks "Echo"
  ↓
🎤 [VoiceSelection] User clicked voice: echo Echo
  ↓
🎤 [OnboardingWizard] updateWizardData called with aiVoice: echo
🎤 [OnboardingWizard] New wizardData.aiVoice: echo
  ↓
User continues to Step 5...
  ↓
🎤 [SetupWizardPage] BEFORE creating payload:
  wizardData.aiVoice: echo
🎤 [SetupWizardPage] AFTER creating payload:
  payload.agent.aiVoice: echo
  ↓
Backend receives request...
  ↓
🎤 [createAgent] Request received
🎤 [createAgent] agent.aiVoice from request: echo
🎤 [createAgent] Setting aiConfig.voiceName to: echo
  ↓
Writes to Firestore: aiConfig.voiceName = "echo"
  ↓
✅ SUCCESS
```

---

## What to Report Back

After testing, please provide:

1. **All console logs** containing 🎤 (copy/paste from browser console)
2. **Backend logs** containing 🎤 (from Firebase Console)
3. **Firestore screenshot** showing the `aiConfig.voiceName` field
4. **Which voice you selected** (so I can compare)

This will tell us EXACTLY where the issue is occurring.

---

## Status

✅ Logging added to:
- Frontend VoiceSelection component
- Frontend OnboardingWizard state updates
- Frontend SetupWizardPage payload creation
- Backend createAgent function (request received)
- Backend createAgent function (Firestore write)

✅ Frontend built
✅ Backend deployed

🧪 Ready for testing
