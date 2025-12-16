# User Preferences & Onboarding Setup

## ✅ What's Implemented

### 1. **Firestore Persistence**
- Preferences are automatically saved to Firestore when user completes onboarding
- Preferences are automatically loaded from Firestore when user signs in
- Collection: `userPreferences` with document ID = user `uid`

### 2. **Smart Onboarding Flow**
- **New users**: See onboarding flow (leagues → teams → preferences)
- **Returning users**: Skip onboarding, go straight to dashboard
- Automatically detects if preferences exist in Firestore

### 3. **Automatic Preference Loading**
When a user signs in:
1. Firebase auth listener triggers
2. Loads preferences from Firestore
3. Updates Redux store
4. View automatically updates based on whether preferences exist

## 🔄 How It Works

### Sign Up Flow
```
1. User signs up → Firebase auth
2. Auth listener checks Firestore for preferences
3. No preferences found → Show onboarding
4. User completes onboarding → Save to Firestore + Redux
5. View switches to dashboard
```

### Sign In Flow
```
1. User signs in → Firebase auth
2. Auth listener loads preferences from Firestore
3. Preferences found → Skip onboarding, go to dashboard
4. No preferences → Show onboarding (edge case)
```

## 📝 Code Structure

### Firestore Service (`services/firestore.ts`)
```typescript
firestoreService.loadPreferences(uid)  // Load from Firestore
firestoreService.savePreferences(uid, prefs)  // Save to Firestore
```

### Redux Actions
```typescript
// Save preferences (async, saves to Firestore)
dispatch(savePreferencesToFirestore({ uid, preferences }))

// Set preferences (sync, just updates Redux)
dispatch(setPreferences(preferences))
```

### View Logic (`pages/Alerts.tsx`)
```typescript
// Automatically determines view based on auth + preferences
useEffect(() => {
  if (isAuthenticated) {
    if (preferences) {
      setView('DASHBOARD');  // User has completed onboarding
    } else {
      setView('ONBOARDING_LEAGUES');  // New user
    }
  } else {
    setView('AUTH');
  }
}, [isAuthenticated, preferences]);
```

## 🎯 Key Features

1. **No duplicate onboarding**: Users only see onboarding once
2. **Persistent preferences**: Saved to Firestore, loaded on sign-in
3. **Automatic routing**: View updates based on preference state
4. **Loading states**: Shows loading while preferences are being fetched

## 🔧 Firestore Structure

```
userPreferences/
  └── {userId}/
      ├── favoriteLeagues: League[]
      ├── favoriteTeams: string[]
      └── notifications: {
          ├── myTeams: { email, sms }
          └── anyTrap: { email, sms }
      }
```

## 🚀 Next Steps (Optional)

- Add default preferences for new users (e.g., all leagues selected)
- Add preference update functionality in Settings page
- Add error handling for Firestore failures
- Add offline support with local cache

