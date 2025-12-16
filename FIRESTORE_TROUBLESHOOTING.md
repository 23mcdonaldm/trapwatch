# Firestore Troubleshooting Guide

## Issue: User documents not appearing in Firestore

### Step 1: Check Browser Console

Open your browser's developer console (F12) and look for these logs when you sign up:

- `🔔 Initializing Firebase auth listener...`
- `👤 Auth state changed: User: ...`
- `🔍 Checking if user document exists in Firestore...`
- `🆕 New user detected - creating user document...`
- `Creating user document in Firestore: { uid, email }`
- `✅ User document created successfully in Firestore`

If you see error messages (❌), note the error code and message.

### Step 2: Check Firestore Security Rules

The most common issue is **Firestore security rules blocking writes**. 

Go to Firebase Console → Firestore Database → Rules and make sure you have rules that allow authenticated users to write:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own user document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

**To test quickly**, you can temporarily allow all reads/writes (⚠️ **ONLY FOR DEVELOPMENT**):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Step 3: Verify Firestore is Enabled

1. Go to Firebase Console
2. Click on "Firestore Database" in the left sidebar
3. If you see "Create database", click it and choose:
   - **Start in test mode** (for development)
   - Select a location (choose closest to your users)
   - Click "Enable"

### Step 4: Check Network Tab

1. Open browser DevTools → Network tab
2. Filter by "firestore"
3. Sign up a new user
4. Look for requests to Firestore
5. Check if requests are failing (red status) or returning errors

### Step 5: Verify Firebase Config

Make sure your `firebase/firebase.ts` has the correct project ID and config matches your Firebase project.

### Common Error Codes

- **permission-denied**: Firestore rules are blocking the operation
- **unauthenticated**: User is not authenticated (check Firebase Auth)
- **not-found**: Document doesn't exist (expected for new users)
- **already-exists**: Document already exists (shouldn't happen for new users)

### Testing the Connection

Add this to your browser console after signing in:

```javascript
import { firestore } from './firebase/firebase';
import { doc, setDoc } from 'firebase/firestore';

// Test write
const testRef = doc(firestore, 'test', 'test123');
await setDoc(testRef, { message: 'Hello Firestore!' });
console.log('Test document created!');
```

If this fails, it's a Firestore rules or connection issue.

