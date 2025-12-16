# User Document in Firestore

## ✅ Implementation Complete

### User Document Structure

When a user signs up, a document is automatically created in the `users` collection with the following structure:

```typescript
{
  email: string;              // User's email from Firebase Auth
  phoneNumber?: string;       // Phone number (optional, set during onboarding)
  displayName?: string;       // Display name from Firebase Auth
  photoURL?: string;          // Profile photo URL from Firebase Auth
  createdAt: string;          // ISO timestamp when user was created
  updatedAt: string;          // ISO timestamp when user was last updated
  preferences: UserPreferences | null;  // User preferences (set during onboarding)
}
```

### UserPreferences Structure

```typescript
{
  favoriteLeagues: League[];  // Selected leagues (NFL, NBA, etc.)
  favoriteTeams: string[];    // Selected team IDs
  notifications: {
    myTeams: {
      email: boolean;
      sms: boolean;
    };
    anyTrap: {
      email: boolean;
      sms: boolean;
    };
    contactEmail?: string;    // Email for notifications
    contactPhone?: string;   // Phone for SMS notifications
  };
}
```

## 🔄 Flow

### New User Signup
1. User signs up with Firebase Auth
2. `onAuthStateChanged` listener triggers
3. System checks if user document exists → **No**
4. Creates user document with:
   - Email from Firebase Auth
   - Display name and photo (if available)
   - `preferences: null` (needs onboarding)
5. User sees onboarding flow
6. User completes onboarding:
   - Preferences saved to user document
   - Phone number saved to user document (if provided)

### Returning User Sign In
1. User signs in with Firebase Auth
2. `onAuthStateChanged` listener triggers
3. System checks if user document exists → **Yes**
4. Loads preferences from user document
5. If preferences exist → Skip onboarding, go to dashboard
6. If no preferences → Show onboarding

## 📝 Firestore Collection

**Collection:** `users`  
**Document ID:** User's Firebase Auth `uid`

### Example Document

```
users/
  └── abc123xyz/
      ├── email: "user@example.com"
      ├── phoneNumber: "(555) 555-5555"
      ├── displayName: "John Doe"
      ├── photoURL: "https://..."
      ├── createdAt: "2024-01-15T10:30:00.000Z"
      ├── updatedAt: "2024-01-15T10:35:00.000Z"
      └── preferences: {
          ├── favoriteLeagues: ["NFL", "NBA"]
          ├── favoriteTeams: ["NFL-KC", "NBA-LAL"]
          └── notifications: {
              ├── myTeams: { email: true, sms: false }
              ├── anyTrap: { email: false, sms: false }
              ├── contactEmail: "user@example.com"
              └── contactPhone: "(555) 555-5555"
          }
      }
```

## 🔧 Functions

### `firestoreService.createUser(uid, email, phoneNumber?, displayName?, photoURL?)`
Creates a new user document in Firestore. Called automatically when a new user signs up.

### `firestoreService.getUser(uid)`
Retrieves the user document from Firestore.

### `firestoreService.savePreferences(uid, preferences)`
Updates the user document with preferences (called during onboarding completion).

### `firestoreService.updatePhoneNumber(uid, phoneNumber)`
Updates the phone number in the user document.

### `firestoreService.updateUser(uid, updates)`
Generic function to update any field in the user document.

## 🎯 Key Features

1. **Automatic User Creation**: User document created on first signup
2. **Persistent Data**: Email, phone, and preferences saved to Firestore
3. **Onboarding Detection**: System knows if user has completed onboarding
4. **Phone Number**: Saved both in user document and preferences
5. **Email Pre-fill**: Email from Firebase Auth is pre-filled in onboarding

## 📍 Files Modified

- `services/firestore.ts` - User document CRUD operations
- `store/firebaseAuthListener.ts` - Creates user document on signup
- `pages/Alerts.tsx` - Saves phone number during onboarding
- `types/firestore.ts` - TypeScript types for Firestore user document

