import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { UserPreferences } from '../../types';
import { firestoreService } from '../../services/firestore';

interface PreferencesState {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
}

const initialState: PreferencesState = {
  preferences: null,
  loading: false,
  error: null,
};

// Async thunk to save preferences to Firestore
export const savePreferencesToFirestore = createAsyncThunk(
  'preferences/saveToFirestore',
  async ({ uid, preferences }: { uid: string; preferences: UserPreferences }) => {
    await firestoreService.savePreferences(uid, preferences);
    return preferences;
  }
);

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    setPreferences: (state, action: PayloadAction<UserPreferences | null>) => {
      state.preferences = action.payload;
      state.error = null;
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    updatePreferences: (state, action: PayloadAction<Partial<UserPreferences>>) => {
      if (state.preferences) {
        state.preferences = { ...state.preferences, ...action.payload };
      } else {
        // If no preferences exist, create new ones with defaults
        state.preferences = {
          favoriteLeagues: action.payload.favoriteLeagues || [],
          favoriteTeams: action.payload.favoriteTeams || [],
          notifications: action.payload.notifications || {
            myTeams: { email: true, sms: false },
            anyTrap: { email: false, sms: false },
          },
        };
      }
      state.error = null;
    },
    clearPreferences: (state) => {
      state.preferences = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(savePreferencesToFirestore.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(savePreferencesToFirestore.fulfilled, (state, action) => {
        state.loading = false;
        state.preferences = action.payload;
      })
      .addCase(savePreferencesToFirestore.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to save preferences';
      });
  },
});

export const { setPreferences, updatePreferences, clearPreferences, setLoading } = preferencesSlice.actions;
export default preferencesSlice.reducer;

