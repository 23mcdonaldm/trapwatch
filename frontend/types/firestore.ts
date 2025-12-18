import { UserPreferences } from '../types';

export interface FirestoreUser {
  email: string;
  phoneNumber?: string;
  displayName?: string;
  photoURL?: string;
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
  preferences: UserPreferences;
}

