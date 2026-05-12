# Merxus - AI Communication Command Center

A modern web application for Merxus, an AI-assisted communication platform for offices, real estate teams, and restaurants.

## Features

- 🎨 **Modern UI** - Built with React and TailwindCSS
- 🔥 **Firebase Integration** - Authentication, Firestore, and Storage ready
- 📱 **Fully Responsive** - Optimized for both web and mobile devices
- 🎨 **Green & White Theme** - Consistent color scheme throughout
- ⚡ **Fast Development** - Powered by Vite for lightning-fast HMR

## Tech Stack

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **TailwindCSS** - Utility-first CSS framework
- **Firebase** - Backend services (Auth, Firestore, Storage)
- **React Router** - Client-side routing

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn

### Installation

1. Install dependencies:
```bash
yarn install
```

2. Set up Firebase:
   - Create a `.env` file in the root directory
   - Copy the example from `.env.example`
   - Fill in your Firebase project credentials
   - Optional paid-social tracking: set `VITE_META_PIXEL_ID` to the Meta Pixel ID for `merxusllc.com`

### Meta Paid-Social Tracking

The app initializes Meta Pixel only when `VITE_META_PIXEL_ID` is present. Landing pages collect and persist `utm_*`, `fbclid`, `adVariant`, referrer, and landing page URL, then include that attribution in paid-social lead submissions.

Paid-social routes:
- `/office-ai-front-desk`
- `/real-estate-ai`
- `/restaurant-ai`

Policy links used by landing pages and forms:
- `/privacy-policy`
- `/terms-of-service`

3. Start the development server:
```bash
yarn dev
```

4. Open your browser to `http://localhost:5173`

## Project Structure

```
merxus-app/
├── src/
│   ├── components/      # Reusable React components
│   ├── pages/           # Page components
│   ├── firebase/        # Firebase configuration
│   ├── App.jsx          # Main app component
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles with Tailwind
├── public/              # Static assets
├── index.html           # HTML template
└── package.json         # Dependencies
```

## Available Scripts

- `yarn dev` - Start development server
- `yarn build` - Build for production
- `yarn preview` - Preview production build

## Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication, Firestore, and Storage
3. Copy your Firebase config to `.env` file
4. The app will automatically connect to Firebase on startup

## Color Scheme

The app uses a green and white color scheme:
- Primary Green: `#22c55e` (primary-600)
- Light Green: `#4ade80` (primary-400)
- Dark Green: `#16a34a` (primary-700)
- White backgrounds with green accents

## License

Private - Merxus

To deply the backend: gcloud run deploy merxus-ai-backend --source . --region us-central1 --project merxus-backend-215800813926 --allow-unauthenticated

Last Index Created Manually:
{
      "collectionGroup": "tenant_user_activity",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "tenantId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "tenantType",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "timestamp",
          "order": "DESCENDING"
        }
      ]
    }