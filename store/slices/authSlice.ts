import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserData {
  uid: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

interface AuthState {
  userData: UserData | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  userData: null,
  isAuthenticated: false,
  loading: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<{ uid: string; email: string | null; displayName: string | null; photoURL: string | null } | null>) => {
      if (action.payload) {
        state.isAuthenticated = true;
        state.userData = {
          uid: action.payload.uid,
          name: action.payload.displayName || action.payload.email?.split('@')[0] || 'User',
          email: action.payload.email || '',
          avatarUrl: action.payload.photoURL || undefined,
        };
      } else {
        state.isAuthenticated = false;
        state.userData = null;
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    logout: (state) => {
      state.userData = null;
      state.isAuthenticated = false;
    },
    updateUserData: (state, action: PayloadAction<Partial<UserData>>) => {
      if (state.userData) {
        state.userData = { ...state.userData, ...action.payload };
      }
    },
  },
});

export const { setUser, setLoading, logout, updateUserData } = authSlice.actions;
export default authSlice.reducer;

