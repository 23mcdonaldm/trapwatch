import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Comment } from '../../types';

interface CommentsState {
  comments: Record<string, Comment[]>; // gameId -> Comments[]
}

const initialState: CommentsState = {
  comments: {},
};

const commentsSlice = createSlice({
  name: 'comments',
  initialState,
  reducers: {
    setComments: (state, action: PayloadAction<{ gameId: string; comments: Comment[] }>) => {
      state.comments[action.payload.gameId] = action.payload.comments;
    },
    addComment: (state, action: PayloadAction<{ gameId: string; comment: Comment }>) => {
      if (!state.comments[action.payload.gameId]) {
        state.comments[action.payload.gameId] = [];
      }
      state.comments[action.payload.gameId].push(action.payload.comment);
    },
    updateComment: (state, action: PayloadAction<{ gameId: string; commentId: string; updates: Partial<Comment> }>) => {
      const comments = state.comments[action.payload.gameId];
      if (comments) {
        const updateCommentInTree = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === action.payload.commentId) {
              return { ...comment, ...action.payload.updates };
            }
            if (comment.replies) {
              return { ...comment, replies: updateCommentInTree(comment.replies) };
            }
            return comment;
          });
        };
        state.comments[action.payload.gameId] = updateCommentInTree(comments);
      }
    },
    clearComments: (state, action: PayloadAction<string>) => {
      delete state.comments[action.payload];
    },
  },
});

export const { setComments, addComment, updateComment, clearComments } = commentsSlice.actions;
export default commentsSlice.reducer;

