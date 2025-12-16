# Firestore Security Rules

## Required Rules for User Document Creation

Go to **Firebase Console → Firestore Database → Rules** and paste these rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - allow authenticated users to create and manage their own document
    match /users/{userId} {
      // Allow read if user is authenticated and accessing their own document
      allow read: if request.auth != null && request.auth.uid == userId;
      
      // Allow create if user is authenticated and creating their own document
      allow create: if request.auth != null && request.auth.uid == userId;
      
      // Allow update if user is authenticated and updating their own document
      allow update: if request.auth != null && request.auth.uid == userId;
      
      // Allow delete if user is authenticated and deleting their own document
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Alternative: Simpler Rule (Same Effect)

If you prefer a more concise version:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Important Notes

1. **The user IS authenticated** when they sign up - Firebase Auth creates the user first, THEN we try to create the Firestore document
2. The rule checks `request.auth.uid == userId` which means the authenticated user's ID must match the document ID
3. This ensures users can only access/modify their own documents

## Testing

After updating the rules:
1. Click **"Publish"** to save
2. Wait a few seconds for rules to propagate
3. Try signing up again
4. Check the console - you should see "✅ User document created successfully"

## Troubleshooting

If you still get permission errors:
1. Make sure you clicked "Publish" after updating rules
2. Wait 10-20 seconds for rules to propagate globally
3. Check that the user is actually authenticated (you should see their email in console logs)
4. Verify the document path matches: `users/{userId}` where `userId` is the Firebase Auth UID

