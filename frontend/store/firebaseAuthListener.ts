import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/firebase';
import { store } from './index';
import { setUser, setLoading } from './slices/authSlice';
import { setPreferences, setLoading as setPreferencesLoading } from './slices/preferencesSlice';
import { firestoreService } from '../services/firestore';

// Initialize Firebase auth listener
export const initFirebaseAuthListener = () => {
  console.log('🔔 Initializing Firebase auth listener...');
  
  const unsubscribe = onAuthStateChanged(auth, async (user) => {
    console.log('👤 Auth state changed:', user ? `User: ${user.email} (${user.uid})` : 'No user');
    
    // Extract only serializable data from Firebase User object
    const userData = user ? {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      photoURL: user.photoURL,
    } : null;
    
    store.dispatch(setUser(userData));
    
    if (user) {
      try {
        // Check if user document exists in Firestore
        console.log('🔍 Checking if user document exists in Firestore...');
        const firestoreUser = await firestoreService.getUser(user.uid);
        
        if (!firestoreUser) {
          console.log('🆕 New user detected - creating user document...');
          // New user - create user document
          await firestoreService.createUser(
            user.uid,
            user.email || '',
            undefined, // Phone number will be set during onboarding
            user.displayName || undefined,
            user.photoURL || undefined
          );
          // New user needs onboarding
          store.dispatch(setPreferences(null));
        } else {
          console.log('✅ Existing user found - loading preferences...');
          // Existing user - load preferences
          if (firestoreUser.preferences) {
            store.dispatch(setPreferences(firestoreUser.preferences));
          } else {
            // User exists but no preferences - needs onboarding
            store.dispatch(setPreferences(null));
          }
        }
      } catch (error) {
        console.error('❌ Error in auth listener:', error);
      }
      
      store.dispatch(setPreferencesLoading(false));
    } else {
      // Clear preferences on logout
      store.dispatch(setPreferences(null));
      store.dispatch(setPreferencesLoading(false));
    }
    
    store.dispatch(setLoading(false));
  });

  return unsubscribe;
};

