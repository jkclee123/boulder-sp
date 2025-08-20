# Boulder SP - Boulder Sport Pass Marketplace

A React-based web application for managing and trading boulder sport passes between users.

## Project Structure

```
boulder-sp/
├── web/                 # Frontend React application
├── functions/           # Firebase Cloud Functions (backend)
├── firebase.json        # Firebase configuration
└── firestore.rules      # Firestore security rules
```

## Features Implemented

### ✅ Epic 1: Foundation, Auth & User Profile
- **Story 1.1**: Project & Firebase Initialization ✅
- **Story 1.2**: User Authentication ✅  
- **Story 1.3**: Account Profile Page ✅
- **Story 1.4**: Mandatory Profile Completion (Next)

### 🔄 Epic 2: Core Pass & Market Viewing
- **Story 2.1**: My Pass Page - View Private & Market Passes
- **Story 2.2**: My Pass Page - View Expired Passes  
- **Story 2.3**: Market Page - View & Filter Listings

### 📋 Epic 3: Pass Transactions & Marketplace Interaction
- **Story 3.1**: List Private Pass on Market
- **Story 3.2**: Unlist Market Pass
- **Story 3.3**: Transfer Pass to Another User
- **Story 3.4**: Pass Transaction Logging
- **Story 3.5**: Contact Seller from Market

### 🛠️ Epic 4: Admin Portal & Pass Lifecycle Management
- **Story 4.1**: Admin Pass Management
- **Story 4.2**: Transfer Admin Pass to User
- **Story 4.3**: Consume User Pass

## Getting Started

### Prerequisites
- Node.js 18+
- Firebase CLI
- Firebase project with Authentication, Firestore, and Functions enabled

### Frontend Setup (web/)
```bash
cd web
npm install
npm run dev
```

### Backend Setup (functions/)
```bash
cd functions
npm install
npm run build
npm run serve  # For local development
```

### Environment Variables
Create a `.env` file in the `web/` directory:
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_USE_EMULATORS=true  # For local development
```

## Profile Management (Story 1.3)

The Account Profile page allows users to:
- View their current profile information
- Edit their name and phone number
- See profile completion status
- View account creation and update timestamps

### Profile Fields
- **Full Name** (required): User's display name
- **Phone Number** (required): Contact information for pass transactions
- **Email**: Automatically populated from authentication provider

### Profile Completion
Users must complete their profile (provide name and phone number) before accessing core application features. The profile page shows a clear status indicator and guides users through the completion process.

## Development

### Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Firebase SDK
- **Backend**: Firebase Cloud Functions, Firestore
- **Authentication**: Firebase Auth (Google, Apple)
- **Styling**: CSS with CSS custom properties for theming

### Code Style
- TypeScript strict mode enabled
- ESLint configuration with React and TypeScript rules
- Consistent component structure and naming conventions

## Deployment

### Frontend
```bash
cd web
npm run build
firebase deploy --only hosting
```

### Backend
```bash
cd functions
npm run build
firebase deploy --only functions
```

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for all new functionality
3. Test changes locally before submitting
4. Update this README for any new features or setup requirements
