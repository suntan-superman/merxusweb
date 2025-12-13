# Restaurant Dashboard - Installation & Setup

## Overview
Complete restaurant management interface with:
- 📅 **Reservation Calendar** - Syncfusion-based calendar with color-coded reservations
- 🍽️ **Orders Panel** - Real-time order tracking with status management

## Files Created

### Components
- `RestaurantDashboard.jsx` - Main container with view switching
- `ReservationCalendar.jsx` - Syncfusion calendar for reservations
- `OrdersPanel.jsx` - Real-time orders list with status tracking

### Styles
- `RestaurantDashboard.css` - Layout and main styles
- `ReservationCalendar.css` - Calendar styling
- `OrdersPanel.css` - Orders panel styling

## Installation Steps

### 1. Install Syncfusion Scheduler
```bash
cd web
npm install @syncfusion/ej2-react-schedule @syncfusion/ej2-base @syncfusion/ej2-buttons @syncfusion/ej2-popups @syncfusion/ej2-calendars
```

### 2. Update Router (App.jsx)
Add route to your restaurant routes:

```jsx
import RestaurantDashboard from './components/restaurant/RestaurantDashboard';

// Inside your router configuration
{
  path: '/restaurant/dashboard-new',
  element: <RestaurantDashboard />,
  requiresAuth: true
}
```

### 3. Add to Navigation
Update your restaurant sidebar/nav to link to the new dashboard.

## Features

### Reservation Calendar
- **Multiple Views**: Day, Week, Month, Agenda
- **Color Coding**: 
  - 🟢 Green: 1-4 guests (small)
  - 🟡 Yellow: 5-8 guests (medium)
  - 🔴 Red: 9+ guests (large)
- **Real-time Updates**: Firestore listener for live reservations
- **Event Details**: Customer name, phone, special requests on hover
- **Date Parsing**: Handles various date/time formats from AI
  - "December 12th at 7 p.m."
  - "Tomorrow at 7 PM"
  - "Saturday"
  - Relative dates

### Orders Panel
- **Real-time List**: Shows today's orders sorted by time
- **Status Tracking**:
  - 🆕 New
  - ✓ Confirmed
  - 👨‍🍳 Preparing
  - 📦 Ready
  - ✅ Picked Up
  - ❌ Cancelled
- **Quick Status Update**: Click status button to advance to next status
- **Order Stats**:
  - Total orders
  - Pending count
  - Completed count
  - Daily revenue
- **Filtering**:
  - All Orders
  - Pending (new/confirmed/preparing)
  - Completed (picked up/cancelled)
- **Expandable Details**:
  - Full item list with prices
  - Pricing breakdown (subtotal/tax/total)
  - Customer phone number (clickable)
  - Order notes
- **Wait Time**: Shows how long order has been pending
- **Visual Indicators**:
  - 🚗 Pickup / 🛵 Delivery badge
  - Color-coded status buttons

## Firestore Structure Required

Make sure your Firestore has:

```
restaurants/{restaurantId}/
  ├── reservations/
  │   ├── {id}
  │   │   ├── customerName (string)
  │   │   ├── customerPhone (string)
  │   │   ├── partySize (number)
  │   │   ├── date (string) - "December 12th" or date format
  │   │   ├── time (string) - "7 p.m." or time format
  │   │   ├── specialRequests (string, optional)
  │   │   ├── status (string) - "confirmed", "cancelled"
  │   │   ├── createdAt (timestamp)
  │   │   └── updatedAt (timestamp)
  │
  └── orders/
      ├── {id}
      │   ├── customerName (string)
      │   ├── customerPhone (string)
      │   ├── items (array)
      │   │   ├── quantity (number)
      │   │   ├── name (string)
      │   │   ├── price (number)
      │   │   └── unitPrice (number)
      │   ├── subtotal (number)
      │   ├── tax (number)
      │   ├── total (number)
      │   ├── status (string) - "new", "confirmed", "preparing", "ready", "picked_up", "cancelled"
      │   ├── orderType (string) - "pickup", "delivery"
      │   ├── notes (string, optional)
      │   ├── createdAt (timestamp)
      │   └── updatedAt (timestamp)
```

## Usage

### View All Reservations
1. Click "📅 Calendar" tab
2. Switch between Day/Week/Month views
3. Hover over events for details
4. Check legend for party size color coding

### View All Orders
1. Click "🍽️ Orders" tab
2. Filter by status (All/Pending/Completed)
3. Click order to expand details
4. Click status button to advance order
5. Click phone number to call customer

### Dashboard View
Default view shows both calendar and orders side-by-side for easy restaurant workflow.

## Customization Options

### Colors
Modify in component files:
```js
// ReservationCalendar.jsx
const PARTY_SIZE_COLORS = { /* ... */ }

// OrdersPanel.jsx
const ORDER_STATUS_COLORS = { /* ... */ }
```

### Calendar Height
Adjust in `ReservationCalendar.jsx`:
```jsx
height={fullScreen ? '100vh' : '600px'}
```

### Wait Time Warning
Add visual warning for old orders:
```jsx
// In OrdersPanel.jsx, modify getWaitTime()
if (minutes > 30) {
  return `${minutes}m ago ⚠️`;
}
```

## Performance Optimization

### Firestore Indexes
Recommended indexes for optimal performance:

```
# reservations collection
- Collection: reservations
  Fields: status (Ascending), createdAt (Descending)

# orders collection
- Collection: orders
  Fields: createdAt (Descending)
  - Filter: date range for daily orders
```

Create indexes in Firebase Console or via `firestore.indexes.json`.

## Next Steps

1. ✅ Install Syncfusion
2. ✅ Add route to App.jsx
3. ✅ Update navigation
4. ✅ Test with real data
5. 🔲 Add sound notifications for new orders
6. 🔲 Add SMS/call buttons to orders
7. 🔲 Add reservation editing modal
8. 🔲 Add kitchen display system (KDS) view

## Troubleshooting

**Calendar not showing events?**
- Check Firestore `reservations` collection exists
- Verify `status === 'confirmed'`
- Check date/time parsing - add console.log in `parseReservationDateTime()`

**Orders not updating in real-time?**
- Verify Firestore listener is active
- Check browser console for Firestore errors
- Make sure `createdAt` is proper Timestamp format

**Syncfusion styling looks off?**
- Import Syncfusion CSS in main app file:
```jsx
import '@syncfusion/ej2-base/styles/material.css';
import '@syncfusion/ej2-buttons/styles/material.css';
import '@syncfusion/ej2-schedule/styles/material.css';
```

## Support
For Syncfusion issues: https://www.syncfusion.com/react-components/react-scheduler
For Firestore issues: https://firebase.google.com/docs/firestore

---
Last Updated: December 12, 2025
