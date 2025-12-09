# 📞 Phone Formatter Expansion Guide

## 🎯 Purpose
The `phoneFormatter.js` utility is now available app-wide. This guide shows where to apply it next for maximum consistency.

---

## ✅ Already Applied

1. **Wizard - Business Details** (`BusinessDetails.jsx`)
   - Input field formats as user types
   - Display: `(XXX) XXX-XXXX`

2. **Wizard - Twilio Setup** (`TwilioSetup.jsx`)
   - Unassigned numbers display
   - Available numbers search results
   - Display: `+1 (XXX) XXX-XXXX`

---

## 🔜 Recommended Next Applications

### **Priority 1: Dashboard Phone Displays**

#### **Estate Dashboard - Leads**
**File:** `web/src/pages/estate/EstateLeadsPage.jsx`

**Current:** Raw phone numbers in leads table
```jsx
// BEFORE
<td>{lead.phone}</td>

// AFTER
<td>{formatPhoneDisplay(lead.phone)}</td>
```

**Impact:** Professional lead display

---

#### **Estate Dashboard - Callbacks**
**File:** `mobile/src/screens/CallbacksScreen.js`

**Current:** Raw phone numbers
```jsx
// BEFORE
<Text>{callback.phone}</Text>

// AFTER
<Text>{formatPhoneDisplay(callback.phone)}</Text>
```

**Impact:** Easier to read callback list

---

#### **Restaurant Dashboard - Customers**
**File:** `web/src/pages/restaurant/CustomersPage.jsx`

**Current:** Inconsistent phone display
```jsx
// BEFORE
<td>{customer.phoneNumber}</td>

// AFTER
<td>{formatPhoneDisplay(customer.phoneNumber)}</td>
```

**Impact:** Professional customer list

---

#### **Voice Dashboard - Call History**
**File:** `web/src/pages/voice/VoiceCallsPage.jsx`

**Current:** Raw caller IDs
```jsx
// BEFORE
<td>{call.from}</td>

// AFTER
<td>{formatPhoneDisplay(call.from)}</td>
```

**Impact:** Easier to scan call logs

---

### **Priority 2: Settings & Profile Pages**

#### **Restaurant Settings**
**File:** `web/src/pages/restaurant/SettingsPage.jsx`

**Current:** Phone input without formatting
```jsx
// BEFORE
<input 
  type="tel"
  value={settings.phone}
  onChange={(e) => setSettings({...settings, phone: e.target.value})}
/>

// AFTER
<input 
  type="tel"
  value={settings.phone}
  onChange={(e) => setSettings({...settings, phone: formatPhoneInput(e.target.value)})}
/>
```

**Impact:** Live formatting as user types

---

#### **Estate Settings**
**File:** `web/src/pages/estate/EstateSettingsPage.jsx`

Similar changes for contact phone numbers.

---

#### **Voice Settings**
**File:** `web/src/pages/voice/VoiceSettingsPage.jsx`

Similar changes for forwarding numbers.

---

### **Priority 3: Mobile App**

#### **Mobile - Lead Detail**
**File:** `mobile/src/screens/estate/LeadDetailScreen.js`

**Current:** Raw phone display and input
```jsx
// BEFORE
<Text>{lead.phone}</Text>

// AFTER
<Text>{formatPhoneDisplay(lead.phone)}</Text>
```

---

#### **Mobile - Settings**
**File:** `mobile/src/screens/SettingsScreen.js`

Apply formatter to business phone input.

---

#### **Mobile - Showings**
**File:** `mobile/src/screens/estate/ShowingsScreen.js`

Format attendee phone numbers.

---

### **Priority 4: Create/Edit Forms**

#### **Create Listing Form**
**File:** `web/src/components/listings/ListingDialog.jsx`

Format agent phone number input (if present).

---

#### **Create Customer Form**
**File:** `web/src/components/customers/CustomerDialog.jsx`

Format customer phone input.

---

#### **User Management**
**File:** `web/src/pages/restaurant/UsersPage.jsx`

Format user phone numbers in table and edit dialog.

---

## 🛠️ How to Apply

### **Step 1: Import the Formatter**
```javascript
import { formatPhoneInput, formatPhoneDisplay } from '../../utils/phoneFormatter';
// Adjust path based on file location
```

### **Step 2: For Input Fields**
Use `formatPhoneInput` in onChange:
```javascript
<input
  type="tel"
  value={phone}
  onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
  placeholder="(555) 123-4567"
/>
```

### **Step 3: For Display Only**
Use `formatPhoneDisplay`:
```javascript
<td>{formatPhoneDisplay(customer.phone)}</td>
<Text>{formatPhoneDisplay(lead.phone)}</Text>
<p>Contact: {formatPhoneDisplay(settings.contactPhone)}</p>
```

### **Step 4: For API Calls (Twilio)**
Use `toE164` before sending to backend:
```javascript
const cleanPhone = toE164(phone); // +15551234567
await twilioAPI.sendSMS(cleanPhone, message);
```

---

## 📊 Format Reference

| Function | Input | Output | Use Case |
|----------|-------|--------|----------|
| `formatPhoneInput()` | `5551234567` | `(555) 123-4567` | User typing |
| `formatPhoneDisplay()` | `5551234567` | `+1 (555) 123-4567` | Display only |
| `toE164()` | `(555) 123-4567` | `+15551234567` | Twilio API |
| `getRawPhone()` | `(555) 123-4567` | `5551234567` | Extract digits |
| `isValidPhone()` | `(555) 123-4567` | `true` | Validation |

---

## 🎨 Consistency Checklist

When applying the formatter to a new component:

- [ ] Import functions at top of file
- [ ] Use `formatPhoneInput` for all `<input type="tel">`
- [ ] Use `formatPhoneDisplay` for all read-only displays
- [ ] Update placeholder to match format: `(555) 123-4567`
- [ ] Test with various inputs:
  - `5551234567` (raw)
  - `555-123-4567` (dashed)
  - `(555) 123-4567` (already formatted)
  - `+15551234567` (E.164)
- [ ] Verify validation still works
- [ ] Check mobile responsiveness

---

## 🧪 Testing Template

After applying the formatter:

```javascript
// Test Cases
const testInputs = [
  '5551234567',           // Raw
  '555-123-4567',         // Dashed
  '(555) 123-4567',       // Formatted
  '+15551234567',         // E.164
  '1 (555) 123-4567',     // With country code
  '5 5 5 1 2 3 4 5 6 7'  // With spaces
];

// All should format to: (555) 123-4567
testInputs.forEach(input => {
  console.log(`${input} → ${formatPhoneInput(input)}`);
});
```

---

## 🚀 Quick Wins (30 mins each)

1. **Estate Leads Table** - 5 lines changed, huge visual impact
2. **Restaurant Customers** - 5 lines changed, professional look
3. **Voice Call History** - 5 lines changed, easier to read
4. **Settings Pages** - 10-15 lines changed, better UX

---

## 🔮 Advanced Features (Future)

### International Support
```javascript
export function formatInternational(phone, country) {
  // Format for different countries
  // GB: +44 20 1234 5678
  // FR: +33 1 23 45 67 89
  // etc.
}
```

### React Hook (Already Included)
```javascript
import { usePhoneInput } from '../../utils/phoneFormatter';

function MyComponent() {
  const phone = usePhoneInput('', (data) => {
    console.log('Formatted:', data.formatted);
    console.log('Raw:', data.raw);
    console.log('E.164:', data.e164);
    console.log('Valid:', data.isValid);
  });

  return (
    <input
      type="tel"
      value={phone.value}
      onChange={phone.onChange}
    />
  );
}
```

### Validation with Icons
```javascript
<div className="relative">
  <input
    type="tel"
    value={phone}
    onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
  />
  {isValidPhone(phone) && (
    <CheckCircle className="absolute right-2 top-2 text-green-500" />
  )}
  {phone && !isValidPhone(phone) && (
    <AlertCircle className="absolute right-2 top-2 text-red-500" />
  )}
</div>
```

---

## 📝 Notes

### Why Format Matters
- **Readability:** `+1 (661) 234-5678` vs `16612345678`
- **Professionalism:** Consistent formatting = polished app
- **Usability:** Easier to scan lists, fewer errors
- **Trust:** Users trust apps with attention to detail

### Mobile Considerations
- On mobile, use `type="tel"` for number keyboard
- Format doesn't interfere with click-to-call
- Still works with `tel:` links:
  ```javascript
  <a href={`tel:${toE164(phone)}`}>
    {formatPhoneDisplay(phone)}
  </a>
  ```

---

**The formatter is ready - now it's just a matter of applying it everywhere for consistency!** 📞✨
