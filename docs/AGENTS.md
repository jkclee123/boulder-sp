# Boulder SP - Agent Guide

Welcome to Boulder SP! This guide helps coding agents understand and contribute to our climbing gym pass marketplace platform.

## 📋 Project Overview

**Boulder SP** is a secondary marketplace for climbing gym passes, enabling users to buy, sell, and transfer gym passes. The platform serves two main user types:

- **Regular Users**: Can manage their passes, list them on the marketplace, and purchase from others
- **Gym Administrators**: Can issue passes, consume passes for gym entry, and manage gym inventory

### Key Features
- User authentication via Firebase Auth
- Pass marketplace with Telegram-based contact system
- Admin portal for gym management
- Real-time pass tracking and transactions
- Mobile-first responsive design

### Technology Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Firebase Cloud Functions + TypeScript
- **Database**: Firestore (NoSQL)
- **Authentication**: Firebase Auth
- **Hosting**: Firebase Hosting
- **Payments**: Off-platform via Telegram

## 🏗️ Project Structure

```
boulder-sp/
├── web/                          # React frontend
│   ├── src/
│   │   ├── pages/                # Page components
│   │   ├── providers/            # React context providers
│   │   ├── types/                # TypeScript type definitions
│   │   └── firebase.ts           # Firebase configuration
│   ├── package.json
│   └── vite.config.ts
├── functions/                    # Firebase Cloud Functions
│   ├── src/                     # Function implementations
│   └── package.json
├── firestore.rules              # Firestore security rules
└── firebase.json               # Firebase project configuration
```

## 🚀 Build & Development Commands

### Frontend (React + Vite)
```bash
cd web
npm install              # Install dependencies
npm run dev             # Start development server (http://localhost:5173)
npm run build           # Build for production
npm run preview         # Preview production build
npm run lint            # Run ESLint
```

### Backend (Firebase Functions)
```bash
cd functions
npm install             # Install dependencies
npm run build           # Compile TypeScript
npm run build:watch     # Watch mode compilation
npm run serve           # Start Firebase emulators
npm run deploy          # Deploy functions to Firebase
```

### Firebase Emulators (Development)
```bash
firebase emulators:start    # Start all emulators (Auth, Firestore, Functions, Hosting)
```

### Environment Setup
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Install dependencies in both `web/` and `functions/` directories

## 📝 Code Style Guidelines

### TypeScript
- Use strict TypeScript configuration
- Define interfaces for all data structures
- Use union types for enums and constrained values
- Leverage Firestore type safety with proper typing

### Naming Conventions
- **Files**: kebab-case for components, camelCase for utilities
- **Functions**: camelCase
- **Classes/Types**: PascalCase
- **Constants**: SCREAMING_SNAKE_CASE
- **Firebase Functions**: kebab-case with descriptive names

### React Best Practices
- Use functional components with hooks
- Implement proper error boundaries
- Follow React 19 patterns and best practices
- Use TypeScript for all component props

### Firebase Functions
- Keep functions focused on single responsibilities
- Use proper error handling with Firebase HttpsError
- Implement input validation
- Follow serverless best practices

## 🧪 Testing Instructions

### Unit Tests
```bash
# Frontend unit tests (when implemented)
cd web
npm test

# Backend unit tests (when implemented)
cd functions
npm test
```

### Integration Testing
- Test user authentication flows
- Verify pass transfer logic
- Test marketplace listing/unlisting
- Validate admin consumption processes

### Manual Testing Checklist
- [ ] User registration and login
- [ ] Profile completion flow
- [ ] Pass marketplace browsing
- [ ] Pass listing and unlisting
- [ ] Pass transfer between users
- [ ] Admin pass management
- [ ] Pass consumption process
- [ ] Mobile responsiveness

## 🔒 Security Considerations

### Authentication & Authorization
- All user actions require Firebase Auth
- Admin functions verify `isAdmin` flag
- Users can only access their own data
- Admin operations restricted to their `adminGym`

### Data Validation
- Input sanitization on all user inputs
- Phone numbers: exactly 8 digits
- Telegram IDs: validated format (no @ symbol)
- Unique constraints: phone numbers and gym member IDs

### Firestore Security Rules
Key security principles:
- Users can read/write only their own documents
- Admins can read/write documents for their gym
- Public marketplace data is readable by all authenticated users
- Transaction logs are immutable once created

### Best Practices
- Never expose Firebase config in client-side code
- Use environment variables for sensitive configuration
- Implement proper error handling without exposing sensitive data
- Regular security audits of Firestore rules

## 🌍 Business Logic & Domain Rules

### Pass Types & Lifecycle
1. **adminPass**: Created by admins, never reduced on transfer, physically deleted
2. **privatePass**: User's personal passes, can be listed on market
3. **marketPass**: Listed for sale, references parent privatePass
4. **passLog**: Immutable transaction records

### Critical Business Rules
- **Hong Kong Time**: All timestamps in UTC+8
- **Currency**: All prices in HKD
- **Soft Deletes**: Use `active` flag (except adminPass)
- **Unique Constraints**: Phone numbers globally unique, gym member IDs unique per gym
- **Consumption Priority**: privatePass before marketPass
- **Transfer Validation**: Single pass type per transaction

### User Experience Flows
- **New User**: Login → Forced profile completion → Main app
- **Regular User**: Market browsing → Contact via Telegram → Off-platform payment
- **Admin User**: Pass management → User search → Consumption

## 🔧 Development Workflow

### Feature Development
1. **Planning**: Review PRD and update relevant documentation
2. **Implementation**: Follow existing patterns and TypeScript best practices
3. **Testing**: Manual testing of user flows and edge cases
4. **Code Review**: Ensure adherence to style guidelines and security practices

### Firebase Deployment
```bash
firebase deploy --only hosting,functions  # Deploy web app and functions
firebase deploy --only firestore:rules    # Update security rules
```

### Common Development Tasks
- **Adding new pass types**: Update types, Firestore rules, and UI components
- **Modifying business logic**: Update both frontend and Cloud Functions
- **UI changes**: Follow existing component patterns and responsive design
- **Database changes**: Update Firestore rules and data models

## 🐛 Troubleshooting

### Common Issues
- **Emulator connectivity**: Check IP addresses in firebase.ts match your network
- **TypeScript errors**: Ensure proper imports and type definitions
- **Firebase permissions**: Verify user authentication and security rules
- **Build failures**: Check TypeScript compilation in both web/ and functions/

### Debug Commands
```bash
firebase functions:log     # View function execution logs
firebase emulators:start   # Start local emulators for testing
```

## 📚 Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [React 19 Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev/)

---

**Remember**: This is a marketplace platform handling real transactions. Always prioritize data integrity, security, and user experience in your implementations.
