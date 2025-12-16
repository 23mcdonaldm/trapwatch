# Redux Migration Guide

## ✅ Completed

1. **Redux Store Setup**
   - Created store with Redux Toolkit
   - Added typed hooks (`useAppDispatch`, `useAppSelector`)
   - Set up Firebase auth listener integration

2. **Redux Slices Created**
   - `authSlice` - Firebase auth state (currentUser, userData, isAuthenticated, loading)
   - `votesSlice` - User votes for games
   - `preferencesSlice` - User preferences (leagues, teams, notifications)
   - `commentsSlice` - Game comments
   - `themeSlice` - Theme (light/dark) with localStorage persistence

3. **Components Updated**
   - `index.tsx` - Wrapped app with Redux Provider, initialized Firebase auth listener
   - `App.tsx` - Uses Redux theme slice
   - `Dashboard.tsx` - Uses Redux auth selector
   - `Alerts.tsx` - Fully migrated to Redux (auth, preferences)

## 🔄 Still Using storageService (Needs Migration)

These components still use `storageService` and should be migrated:

1. **`pages/Scoreboard.tsx`**
   - Uses: `storageService.getUserState()`, `storageService.getLeaderboard()`, `storageService.toggleFollow()`
   - Migrate to: Redux auth + votes slices

2. **`pages/Settings.tsx`**
   - Uses: `storageService.getUserState()`, `storageService.savePreferences()`, `storageService.logout()`
   - Migrate to: Redux auth + preferences slices

3. **`pages/GameDetail.tsx`**
   - Uses: `storageService.getComments()`, `storageService.addComment()`, `storageService.vote()`
   - Migrate to: Redux comments + votes slices

4. **`components/GameComponents.tsx`**
   - Uses: `storageService.vote()`, `storageService.getUserState()`
   - Migrate to: Redux votes + auth slices

5. **`components/LiveChatBanner.tsx`**
   - Uses: `storageService.subscribeToComments()`
   - Migrate to: Redux comments slice with subscription pattern

## 📝 How to Use Redux

### Accessing State
```tsx
import { useAppSelector } from '../store/hooks';

const MyComponent = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const userData = useAppSelector((state) => state.auth.userData);
  const preferences = useAppSelector((state) => state.preferences.preferences);
  const votes = useAppSelector((state) => state.votes.votes);
  const theme = useAppSelector((state) => state.theme.theme);
};
```

### Dispatching Actions
```tsx
import { useAppDispatch } from '../store/hooks';
import { setPreferences } from '../store/slices/preferencesSlice';
import { addVote } from '../store/slices/votesSlice';
import { toggleTheme } from '../store/slices/themeSlice';

const MyComponent = () => {
  const dispatch = useAppDispatch();
  
  const handleSave = () => {
    dispatch(setPreferences(newPreferences));
  };
  
  const handleVote = () => {
    dispatch(addVote(newVote));
  };
  
  const handleThemeToggle = () => {
    dispatch(toggleTheme());
  };
};
```

## 🔥 Firebase Auth Integration

Firebase auth automatically syncs with Redux via `initFirebaseAuthListener()`:
- When user signs in → Redux `auth` slice updates
- When user signs out → Redux `auth` slice clears
- Loading state managed automatically

## 🗑️ Next Steps

1. **Remove `storageService`** once all components are migrated
2. **Add Firestore persistence** for votes, preferences, comments (optional)
3. **Add Redux middleware** for localStorage persistence if needed
4. **Update tests** to use Redux store

## 📦 Redux Store Structure

```typescript
{
  auth: {
    currentUser: User | null,
    userData: { uid, name, email, avatarUrl } | null,
    isAuthenticated: boolean,
    loading: boolean
  },
  votes: {
    votes: Record<string, Vote>
  },
  preferences: {
    preferences: UserPreferences | null
  },
  comments: {
    comments: Record<string, Comment[]>
  },
  theme: {
    theme: 'light' | 'dark'
  }
}
```

