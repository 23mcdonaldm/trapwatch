import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import votesReducer from './slices/votesSlice';
import preferencesReducer from './slices/preferencesSlice';
import commentsReducer from './slices/commentsSlice';
import themeReducer from './slices/themeSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    votes: votesReducer,
    preferences: preferencesReducer,
    comments: commentsReducer,
    theme: themeReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

