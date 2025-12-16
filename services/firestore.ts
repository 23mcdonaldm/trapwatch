import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase/firebase';
import { UserPreferences } from '../types';
import { FirestoreUser } from '../types/firestore';

const USERS_COLLECTION = 'users';

export const firestoreService = {
  // Create a new user document in Firestore
  createUser: async (
    uid: string,
    email: string,
    phoneNumber?: string,
    displayName?: string,
    photoURL?: string
  ): Promise<void> => {
    try {
      console.log('Creating user document in Firestore:', { uid, email });
      const now = new Date().toISOString();
      
      // Build user data object, only including defined fields (Firestore doesn't allow undefined)
      const userData: Record<string, any> = {
        email,
        createdAt: now,
        updatedAt: now,
        preferences: null, // Will be set during onboarding
      };

      // Only add optional fields if they are defined
      if (phoneNumber !== undefined && phoneNumber !== null) {
        userData.phoneNumber = phoneNumber;
      }
      if (displayName !== undefined && displayName !== null) {
        userData.displayName = displayName;
      }
      if (photoURL !== undefined && photoURL !== null) {
        userData.photoURL = photoURL;
      }

      const userRef = doc(firestore, USERS_COLLECTION, uid);
      console.log('User document reference:', userRef.path);

      // Create user document with empty preferences (will be set during onboarding)
      await setDoc(userRef, userData);
      
      console.log('✅ User document created successfully in Firestore');
    } catch (error) {
      console.error('❌ Error creating user in Firestore:', error);
      console.error('Error details:', {
        code: (error as any)?.code,
        message: (error as any)?.message,
        stack: (error as any)?.stack,
      });
      throw error;
    }
  },

  // Get user document from Firestore
  getUser: async (uid: string): Promise<FirestoreUser | null> => {
    try {
      const userRef = doc(firestore, USERS_COLLECTION, uid);
      console.log('📖 Fetching user document:', userRef.path);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        console.log('✅ User document found');
        return userDoc.data() as FirestoreUser;
      }
      console.log('ℹ️ User document does not exist');
      return null;
    } catch (error) {
      console.error('❌ Error loading user from Firestore:', error);
      console.error('Error details:', {
        code: (error as any)?.code,
        message: (error as any)?.message,
      });
      return null;
    }
  },

  // Load user preferences from Firestore (from user document)
  loadPreferences: async (uid: string): Promise<UserPreferences | null> => {
    try {
      const user = await firestoreService.getUser(uid);
      return user?.preferences || null;
    } catch (error) {
      console.error('Error loading preferences:', error);
      return null;
    }
  },

  // Save user preferences to Firestore (updates user document)
  savePreferences: async (uid: string, preferences: UserPreferences): Promise<void> => {
    try {
      await updateDoc(doc(firestore, USERS_COLLECTION, uid), {
        preferences,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw error;
    }
  },

  // Update user document (e.g., phone number, email)
  updateUser: async (uid: string, updates: Partial<FirestoreUser>): Promise<void> => {
    try {
      await updateDoc(doc(firestore, USERS_COLLECTION, uid), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  // Update phone number
  updatePhoneNumber: async (uid: string, phoneNumber: string): Promise<void> => {
    try {
      await firestoreService.updateUser(uid, { phoneNumber });
    } catch (error) {
      console.error('Error updating phone number:', error);
      throw error;
    }
  },
};

