import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Vote } from '../../types';

interface VotesState {
  votes: Record<string, Vote>; // gameId -> Vote
}

const initialState: VotesState = {
  votes: {},
};

const votesSlice = createSlice({
  name: 'votes',
  initialState,
  reducers: {
    setVotes: (state, action: PayloadAction<Record<string, Vote>>) => {
      state.votes = action.payload;
    },
    addVote: (state, action: PayloadAction<Vote>) => {
      state.votes[action.payload.gameId] = action.payload;
    },
    updateVote: (state, action: PayloadAction<{ gameId: string; vote: Partial<Vote> }>) => {
      if (state.votes[action.payload.gameId]) {
        state.votes[action.payload.gameId] = {
          ...state.votes[action.payload.gameId],
          ...action.payload.vote,
        };
      }
    },
    removeVote: (state, action: PayloadAction<string>) => {
      delete state.votes[action.payload];
    },
    clearVotes: (state) => {
      state.votes = {};
    },
  },
});

export const { setVotes, addVote, updateVote, removeVote, clearVotes } = votesSlice.actions;
export default votesSlice.reducer;

